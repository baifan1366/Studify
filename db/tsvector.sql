do $$
declare
    tbl record;
    col record;
    tsv_cols text;
    trig_name text;
    idx_name text;
begin
    -- Loop through all tables in ALL schemas except system schemas
    for tbl in
        select table_schema, table_name
        from information_schema.tables
        where table_schema not in ('pg_catalog', 'information_schema', 'auth', 'graphql', 'graphql_public', 'pgbouncer', 'realtime', 'storage', 'vault')
          and table_type = 'BASE TABLE'
    loop
        tsv_cols := '';
        
        -- Find all text/varchar columns in this table
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

        -- Skip tables without any text columns
        if tsv_cols = '' then
            raise notice '⏩ Skipping %.% (no text columns)', tbl.table_schema, tbl.table_name;
            continue;
        end if;

        -- Add search_vector column if missing
        execute format('
            alter table %I.%I
            add column if not exists search_vector tsvector;
        ', tbl.table_schema, tbl.table_name);

        -- Populate existing rows
        execute format('
            update %I.%I
            set search_vector = to_tsvector(''english'', %s);
        ', tbl.table_schema, tbl.table_name, replace(tsv_cols, 'new.', ''));

        -- Trigger name
        trig_name := tbl.table_name || '_search_vector_trigger';

        -- Drop old trigger before creating a new one
        execute format('drop trigger if exists %I on %I.%I;', trig_name, tbl.table_schema, tbl.table_name);

        -- Create trigger function for this table
        execute format($sql$
            create or replace function %I.%I()
            returns trigger as $func$
            begin
                new.search_vector := to_tsvector('english', %s);
                return new;
            end;
            $func$ language plpgsql;
        $sql$, tbl.table_schema, trig_name, tsv_cols);

        -- Create trigger
        execute format('
            create trigger %I
            before insert or update
            on %I.%I
            for each row
            execute function %I.%I();
        ', trig_name, tbl.table_schema, tbl.table_name, tbl.table_schema, trig_name);

        -- Create GIN index for performance
        idx_name := tbl.table_name || '_search_vector_idx';
        execute format('
            create index if not exists %I
            on %I.%I
            using gin(search_vector);
        ', idx_name, tbl.table_schema, tbl.table_name);

        raise notice '✅ Added full-text search for table: %.%', tbl.table_schema, tbl.table_name;
    end loop;
end $$;