DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Enable Row-Level Security on all tables in the 'public' schema
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.table_schema, r.table_name);
    END LOOP;
END $$;


-- Returns the current session's profile.id (bigint) or NULL
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()  -- Supabase auth uses auth.uid() for the current user's ID
    AND p.is_deleted = false
  LIMIT 1;
$$;

-- Is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((
    SELECT role = 'admin'
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND is_deleted = false
    LIMIT 1
  ), false);
$$;

-- Is current user owner of a course?
CREATE OR REPLACE FUNCTION public.is_course_owner(target_course_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((
    SELECT c.owner_id = public.current_profile_id()
    FROM public.course c
    WHERE c.id = target_course_id
      AND c.is_deleted = false
    LIMIT 1
  ), false);
$$;

-- Is current user enrolled in a course?
CREATE OR REPLACE FUNCTION public.is_enrolled(target_course_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollment e
    WHERE e.course_id = target_course_id
      AND e.user_id = public.current_profile_id()
      AND e.status = 'active'
  );
$$;


DO $$ 
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_course_owner(bigint) TO authenticated, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_enrolled(bigint) TO authenticated, anon';
EXCEPTION WHEN others THEN
  NULL; -- Ignore if roles don't exist
END $$;


-- =========================
-- PROFILES POLICY
-- =========================
DO $$ 
BEGIN
  -- Select Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_public'
  ) THEN
    CREATE POLICY profiles_select_public ON public.profiles
      FOR SELECT
      USING (is_deleted = false AND status = 'active');
  END IF;

  -- Update Policy (Owner can update own profile)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = public.current_profile_id())
      WITH CHECK (id = public.current_profile_id());
  END IF;

  -- Insert Policy (Authenticated users can insert their own profile)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_self'
  ) THEN
    CREATE POLICY profiles_insert_self ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =========================
-- COURSE POLICY (Example: Read access for public or members)
-- =========================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'course' AND policyname = 'course_read_public_or_member'
  ) THEN
    CREATE POLICY course_read_public_or_member ON public.course
      FOR SELECT TO authenticated, anon
      USING (
        is_deleted = false AND (
          visibility = 'public' OR
          owner_id = public.current_profile_id() OR
          EXISTS (
            SELECT 1 FROM public.course_enrollment e
            WHERE e.course_id = course.id AND e.user_id = public.current_profile_id() AND e.status = 'active'
          )
        )
      );
  END IF;
  
  -- Owner or Admin can modify
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'course' AND policyname = 'course_cud_owner_or_admin'
  ) THEN
    CREATE POLICY course_cud_owner_or_admin ON public.course
      FOR ALL TO authenticated
      USING (owner_id = public.current_profile_id() OR public.is_admin())
      WITH CHECK (owner_id = public.current_profile_id() OR public.is_admin());
  END IF;
END $$;
