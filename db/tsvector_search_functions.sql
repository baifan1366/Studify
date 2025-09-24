-- =========================
-- STUDIFY COMPREHENSIVE SEARCH FUNCTIONS
-- Created: 2025-09-23
-- Purpose: 统一的搜索函数系统
-- =========================

-- =========================
-- 1. UNIVERSAL SEARCH FUNCTION
-- =========================

-- Universal search function across all searchable tables
CREATE OR REPLACE FUNCTION universal_search(
  search_query text,
  search_tables text[] DEFAULT ARRAY['profiles', 'course', 'course_lesson', 'community_post', 'community_comment', 'classroom', 'community_group', 'ai_agent', 'course_notes', 'tutoring_tutors', 'course_reviews', 'announcements'],
  max_results integer DEFAULT 50,
  min_rank real DEFAULT 0.1
) RETURNS TABLE (
  table_name text,
  record_id bigint,
  title text,
  snippet text,
  rank real,
  content_type text,
  created_at timestamptz,
  additional_data jsonb
) LANGUAGE plpgsql AS $$
DECLARE
  table_name text;
  query_text text;
BEGIN
  -- Prepare the search query
  query_text := plainto_tsquery('english', search_query)::text;
  
  -- Search across specified tables
  FOREACH table_name IN ARRAY search_tables
  LOOP
    -- Profiles search
    IF table_name = 'profiles' THEN
      RETURN QUERY
      SELECT 
        'profiles'::text as table_name,
        p.id as record_id,
        COALESCE(p.display_name, p.full_name, p.email, 'Unknown User') as title,
        LEFT(COALESCE(p.bio, p.display_name || ' - ' || p.role, p.email), 200) as snippet,
        ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank,
        'user'::text as content_type,
        p.created_at,
        jsonb_build_object(
          'role', p.role,
          'avatar_url', p.avatar_url,
          'public_id', p.public_id,
          'status', p.status
        ) as additional_data
      FROM profiles p
      WHERE p.search_vector @@ plainto_tsquery('english', search_query)
        AND p.is_deleted = false
        AND p.status = 'active'
        AND ts_rank(p.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course search
    IF table_name = 'course' THEN
      RETURN QUERY
      SELECT 
        'course'::text as table_name,
        c.id as record_id,
        c.title as title,
        LEFT(COALESCE(c.description, c.title), 200) as snippet,
        ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as rank,
        'course'::text as content_type,
        c.created_at,
        jsonb_build_object(
          'slug', c.slug,
          'category', c.category,
          'level', c.level,
          'thumbnail_url', c.thumbnail_url,
          'price_cents', c.price_cents,
          'is_free', c.is_free,
          'public_id', c.public_id
        ) as additional_data
      FROM course c
      WHERE c.search_vector @@ plainto_tsquery('english', search_query)
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
        AND ts_rank(c.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course lesson search
    IF table_name = 'course_lesson' THEN
      RETURN QUERY
      SELECT 
        'course_lesson'::text as table_name,
        cl.id as record_id,
        cl.title as title,
        LEFT(COALESCE(cl.description, cl.title), 200) as snippet,
        ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) as rank,
        'lesson'::text as content_type,
        cl.created_at,
        jsonb_build_object(
          'course_id', cl.course_id,
          'module_id', cl.module_id,
          'kind', cl.kind,
          'position', cl.position,
          'duration_sec', cl.duration_sec,
          'is_preview', cl.is_preview,
          'public_id', cl.public_id
        ) as additional_data
      FROM course_lesson cl
      JOIN course c ON cl.course_id = c.id
      WHERE cl.search_vector @@ plainto_tsquery('english', search_query)
        AND cl.is_deleted = false
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
        AND ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community post search (existing search_vector)
    IF table_name = 'community_post' THEN
      RETURN QUERY
      SELECT 
        'community_post'::text as table_name,
        cp.id as record_id,
        COALESCE(cp.title, LEFT(cp.body, 50), 'Untitled Post') as title,
        LEFT(COALESCE(cp.body, cp.title, 'No content'), 200) as snippet,
        ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) as rank,
        'post'::text as content_type,
        cp.created_at,
        jsonb_build_object(
          'slug', cp.slug,
          'group_id', cp.group_id,
          'author_id', cp.author_id,
          'public_id', cp.public_id
        ) as additional_data
      FROM community_post cp
      LEFT JOIN community_group cg ON cp.group_id = cg.id
      WHERE cp.search_vector @@ plainto_tsquery('english', search_query)
        AND cp.is_deleted = false
        AND (cg.visibility = 'public' OR cg.id IS NULL)
        AND ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community comment search
    IF table_name = 'community_comment' THEN
      RETURN QUERY
      SELECT 
        'community_comment'::text as table_name,
        cc.id as record_id,
        LEFT(cc.body, 50) as title,
        LEFT(cc.body, 200) as snippet,
        ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) as rank,
        'comment'::text as content_type,
        cc.created_at,
        jsonb_build_object(
          'post_id', cc.post_id,
          'author_id', cc.author_id,
          'parent_id', cc.parent_id,
          'public_id', cc.public_id
        ) as additional_data
      FROM community_comment cc
      JOIN community_post cp ON cc.post_id = cp.id
      LEFT JOIN community_group cg ON cp.group_id = cg.id
      WHERE cc.search_vector @@ plainto_tsquery('english', search_query)
        AND cc.is_deleted = false
        AND cp.is_deleted = false
        AND (cg.visibility = 'public' OR cg.id IS NULL)
        AND ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Classroom search
    IF table_name = 'classroom' THEN
      RETURN QUERY
      SELECT 
        'classroom'::text as table_name,
        cr.id as record_id,
        cr.name as title,
        LEFT(COALESCE(cr.description, cr.name), 200) as snippet,
        ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) as rank,
        'classroom'::text as content_type,
        cr.created_at,
        jsonb_build_object(
          'class_code', cr.class_code,
          'owner_id', cr.owner_id,
          'course_id', cr.course_id,
          'status', cr.status,
          'public_id', cr.public_id
        ) as additional_data
      FROM classroom cr
      WHERE cr.search_vector @@ plainto_tsquery('english', search_query)
        AND cr.is_deleted = false
        AND cr.status = 'active'
        AND ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community group search
    IF table_name = 'community_group' THEN
      RETURN QUERY
      SELECT 
        'community_group'::text as table_name,
        cg.id as record_id,
        cg.name as title,
        LEFT(COALESCE(cg.description, cg.name), 200) as snippet,
        ts_rank(cg.search_vector, plainto_tsquery('english', search_query)) as rank,
        'group'::text as content_type,
        cg.created_at,
        jsonb_build_object(
          'slug', cg.slug,
          'visibility', cg.visibility,
          'owner_id', cg.owner_id,
          'public_id', cg.public_id
        ) as additional_data
      FROM community_group cg
      WHERE cg.search_vector @@ plainto_tsquery('english', search_query)
        AND cg.is_deleted = false
        AND cg.visibility = 'public'
        AND ts_rank(cg.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cg.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- AI agent search
    IF table_name = 'ai_agent' THEN
      RETURN QUERY
      SELECT 
        'ai_agent'::text as table_name,
        aa.id as record_id,
        aa.name as title,
        LEFT(COALESCE(aa.purpose, aa.name), 200) as snippet,
        ts_rank(aa.search_vector, plainto_tsquery('english', search_query)) as rank,
        'ai_agent'::text as content_type,
        aa.created_at,
        jsonb_build_object(
          'owner_id', aa.owner_id,
          'config', aa.config,
          'public_id', aa.public_id
        ) as additional_data
      FROM ai_agent aa
      WHERE aa.search_vector @@ plainto_tsquery('english', search_query)
        AND aa.is_deleted = false
        AND ts_rank(aa.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(aa.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course notes search
    IF table_name = 'course_notes' THEN
      RETURN QUERY
      SELECT 
        'course_notes'::text as table_name,
        cn.id as record_id,
        LEFT(cn.content, 50) as title,
        LEFT(COALESCE(cn.ai_summary, cn.content), 200) as snippet,
        ts_rank(cn.search_vector, plainto_tsquery('english', search_query)) as rank,
        'note'::text as content_type,
        cn.created_at,
        jsonb_build_object(
          'user_id', cn.user_id,
          'lesson_id', cn.lesson_id,
          'timestamp_sec', cn.timestamp_sec,
          'tags', cn.tags,
          'public_id', cn.public_id
        ) as additional_data
      FROM course_notes cn
      WHERE cn.search_vector @@ plainto_tsquery('english', search_query)
        AND cn.is_deleted = false
        AND ts_rank(cn.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cn.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Tutoring tutors search
    IF table_name = 'tutoring_tutors' THEN
      RETURN QUERY
      SELECT 
        'tutoring_tutors'::text as table_name,
        tt.id as record_id,
        COALESCE(tt.headline, 'Tutor Profile') as title,
        LEFT(COALESCE(tt.qualifications, tt.headline, 'Professional Tutor'), 200) as snippet,
        ts_rank(tt.search_vector, plainto_tsquery('english', search_query)) as rank,
        'tutor'::text as content_type,
        tt.created_at,
        jsonb_build_object(
          'user_id', tt.user_id,
          'subjects', tt.subjects,
          'hourly_rate', tt.hourly_rate,
          'rating_avg', tt.rating_avg,
          'rating_count', tt.rating_count,
          'public_id', tt.public_id
        ) as additional_data
      FROM tutoring_tutors tt
      WHERE tt.search_vector @@ plainto_tsquery('english', search_query)
        AND tt.is_deleted = false
        AND ts_rank(tt.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(tt.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course reviews search
    IF table_name = 'course_reviews' THEN
      RETURN QUERY
      SELECT 
        'course_reviews'::text as table_name,
        cr.id as record_id,
        CONCAT('Review (', cr.rating, ' stars)') as title,
        LEFT(COALESCE(cr.comment, 'No comment provided'), 200) as snippet,
        ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) as rank,
        'review'::text as content_type,
        cr.created_at,
        jsonb_build_object(
          'course_id', cr.course_id,
          'user_id', cr.user_id,
          'rating', cr.rating,
          'public_id', cr.public_id
        ) as additional_data
      FROM course_reviews cr
      JOIN course c ON cr.course_id = c.id
      WHERE cr.search_vector @@ plainto_tsquery('english', search_query)
        AND cr.is_deleted = false
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
        AND ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cr.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Announcements search
    IF table_name = 'announcements' THEN
      RETURN QUERY
      SELECT 
        'announcements'::text as table_name,
        a.id as record_id,
        a.title as title,
        LEFT(a.message, 200) as snippet,
        ts_rank(a.search_vector, plainto_tsquery('english', search_query)) as rank,
        'announcement'::text as content_type,
        a.created_at,
        jsonb_build_object(
          'created_by', a.created_by,
          'status', a.status,
          'scheduled_at', a.scheduled_at,
          'public_id', a.public_id
        ) as additional_data
      FROM announcements a
      WHERE a.search_vector @@ plainto_tsquery('english', search_query)
        AND a.is_deleted = false
        AND a.status = 'sent'
        AND ts_rank(a.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
  END LOOP;
END;
$$;

-- =========================
-- 2. CONTENT TYPE SPECIFIC SEARCH FUNCTIONS
-- =========================

-- Search specifically for users
CREATE OR REPLACE FUNCTION search_users(
  search_query text,
  user_role text DEFAULT NULL,
  max_results integer DEFAULT 20
) RETURNS TABLE (
  user_id bigint,
  public_id uuid,
  display_name text,
  full_name text,
  email text,
  role text,
  bio text,
  avatar_url text,
  rank real
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.public_id,
    p.display_name,
    p.full_name,
    p.email,
    p.role,
    p.bio,
    p.avatar_url,
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM profiles p
  WHERE p.search_vector @@ plainto_tsquery('english', search_query)
    AND p.is_deleted = false
    AND p.status = 'active'
    AND (user_role IS NULL OR p.role = user_role)
  ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT max_results;
END;
$$;

-- Search specifically for courses
CREATE OR REPLACE FUNCTION search_courses(
  search_query text,
  course_category text DEFAULT NULL,
  course_level text DEFAULT NULL,
  max_results integer DEFAULT 20
) RETURNS TABLE (
  course_id bigint,
  public_id uuid,
  title text,
  description text,
  slug text,
  category text,
  level text,
  price_cents integer,
  is_free boolean,
  thumbnail_url text,
  rank real
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as course_id,
    c.public_id,
    c.title,
    c.description,
    c.slug,
    c.category,
    c.level,
    c.price_cents,
    c.is_free,
    c.thumbnail_url,
    ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM course c
  WHERE c.search_vector @@ plainto_tsquery('english', search_query)
    AND c.is_deleted = false
    AND c.status = 'active'
    AND c.visibility = 'public'
    AND (course_category IS NULL OR c.category = course_category)
    AND (course_level IS NULL OR c.level = course_level)
  ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT max_results;
END;
$$;

-- =========================
-- 3. SEARCH ANALYTICS FUNCTION
-- =========================

-- Function to log search queries for analytics
CREATE OR REPLACE FUNCTION log_search_query(
  user_id_param bigint,
  query_text text,
  search_type text DEFAULT 'universal',
  results_count integer DEFAULT 0
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (actor_id, action, subject_type, subject_id, meta)
  VALUES (
    user_id_param,
    'search',
    'search_query',
    NULL,
    jsonb_build_object(
      'query', query_text,
      'search_type', search_type,
      'results_count', results_count,
      'timestamp', now()
    )
  );
END;
$$;
