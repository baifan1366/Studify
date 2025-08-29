DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.tables
        where table_schema not in ('pg_catalog', 'information_schema', 'auth', 'graphql', 'graphql_public', 'pgbouncer', 'realtime', 'storage', 'vault')
          AND table_type = 'BASE TABLE'
    LOOP
        -- Enable RLS for each table
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.table_schema, r.table_name);

        RAISE NOTICE '✅ Enabled RLS on %.%', r.table_schema, r.table_name;
    END LOOP;
END $$;
