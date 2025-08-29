do $$
declare
    tbl record;
    col record;
    tsv_cols text;
    trig_name text;
    idx_name text;
begin
    for tbl in
        select table_schema, table_name
        from information_schema.tables
        where table_schema not in ('pg_catalog', 'information_schema', 'auth', 'graphql', 'graphql_public', 'pgbouncer', 'realtime', 'storage', 'vault')
          and table_type = 'BASE TABLE'
    loop
        tsv_cols := '';

        -- Collect text columns for full-text search
        for col in
            select column_name
            from information_schema.columns
            where table_schema = tbl.table_schema
              and table_name = tbl.table_name
              and data_type in ('text', 'character varying')
        loop
            if tsv_cols = '' then
                tsv_cols := format('coalesce(new.%I, '''')', col.column_name);
            else
                tsv_cols := tsv_cols || ' || '' '' || ' || format('coalesce(new.%I, '''')', col.column_name);
            end if;
        end loop;

        -- If table has no text columns, skip full-text search
        if tsv_cols = '' then
            raise notice '⏩ Skipping full-text search for %.% (no text columns)', tbl.table_schema, tbl.table_name;
        else
            -- Add search_vector column
            execute format('
                alter table %I.%I
                add column if not exists search_vector tsvector;
            ', tbl.table_schema, tbl.table_name);

            -- Populate search_vector column
            execute format('
                update %I.%I
                set search_vector = to_tsvector(''english'', %s);
            ', tbl.table_schema, tbl.table_name, replace(tsv_cols, 'new.', ''));

            -- Create or replace trigger
            trig_name := tbl.table_name || '_search_vector_trigger';
            execute format('drop trigger if exists %I on %I.%I;', trig_name, tbl.table_schema, tbl.table_name);

            execute format($sql$
                create or replace function %I.%I()
                returns trigger as $func$
                begin
                    new.search_vector := to_tsvector('english', %s);
                    return new;
                end;
                $func$ language plpgsql;
            $sql$, tbl.table_schema, trig_name, tsv_cols);

            execute format('
                create trigger %I
                before insert or update
                on %I.%I
                for each row
                execute function %I.%I();
            ', trig_name, tbl.table_schema, tbl.table_name, tbl.table_schema, trig_name);

            -- GIN index for full-text search
            idx_name := tbl.table_schema || '_' || tbl.table_name || '_search_vector_idx';
            execute format('
                create index if not exists %I
                on %I.%I
                using gin(search_vector);
            ', idx_name, tbl.table_schema, tbl.table_name);

            raise notice '✅ Added GIN index for full-text search: %.%', tbl.table_schema, tbl.table_name;
        end if;

        -- Add indexes for individual columns
        for col in
            select column_name, data_type
            from information_schema.columns
            where table_schema = tbl.table_schema
              and table_name = tbl.table_name
        loop
            -- Skip search_vector column and large objects
            if col.column_name = 'search_vector' then
                continue;
            end if;

            -- Generate index name based on schema, table, column
            idx_name := tbl.table_schema || '_' || tbl.table_name || '_' || col.column_name || '_idx';

            -- If column is numeric, UUID, boolean, date → B-tree index for filtering & sorting
            if col.data_type in ('integer', 'bigint', 'uuid', 'boolean', 'date', 'timestamp without time zone', 'timestamp with time zone') then
                execute format('
                    create index if not exists %I
                    on %I.%I(%I);
                ', idx_name, tbl.table_schema, tbl.table_name, col.column_name);
            end if;

            -- If column is text/varchar → B-tree index for equality searches
            if col.data_type in ('text', 'character varying') then
                execute format('
                    create index if not exists %I
                    on %I.%I(%I);
                ', idx_name, tbl.table_schema, tbl.table_name, col.column_name);

                -- Trigram index for ILIKE fuzzy search
                execute format('
                    create index if not exists %I_trgm
                    on %I.%I
                    using gin(%I gin_trgm_ops);
                ', idx_name, tbl.table_schema, tbl.table_name, col.column_name);
            end if;
        end loop;

        raise notice '✅ Added B-tree & trigram indexes for table: %.%', tbl.table_schema, tbl.table_name;
    end loop;
end $$;
