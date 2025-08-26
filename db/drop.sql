DO $$ DECLARE
    r RECORD;
BEGIN
    -- Drop all tables in the public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Drop all functions in the public schema
    FOR r IN (SELECT routine_name, specific_name
              FROM information_schema.routines
              WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || '() CASCADE';
    END LOOP;
END $$;