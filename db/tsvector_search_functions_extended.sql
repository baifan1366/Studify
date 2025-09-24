-- =========================
-- STUDIFY COMPREHENSIVE SEARCH FUNCTIONS - 扩展版本
-- Created: 2025-09-23
-- Purpose: 包含所有遗漏表的统一搜索函数系统
-- =========================

-- =========================
-- 1. ENHANCED UNIVERSAL SEARCH FUNCTION
-- =========================

-- Updated universal search function with all missing tables
CREATE OR REPLACE FUNCTION universal_search_enhanced(
  search_query text,
  search_tables text[] DEFAULT ARRAY[
    'profiles', 'course', 'course_lesson', 'community_post', 'community_comment', 
    'classroom', 'community_group', 'ai_agent', 'course_notes', 'tutoring_tutors', 
    'course_reviews', 'announcements', 'course_quiz_question', 'ai_workflow_templates',
    'learning_goal', 'classroom_assignment', 'classroom_posts', 'course_chapter',
    'mistake_book', 'tutoring_note', 'community_quiz', 'community_quiz_question'
  ],
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
BEGIN
  -- Search across specified tables
  FOREACH table_name IN ARRAY search_tables
  LOOP
    -- AI workflow templates search
    IF table_name = 'ai_workflow_templates' THEN
      RETURN QUERY
      SELECT 
        'ai_workflow_templates'::text as table_name,
        awt.id as record_id,
        awt.name as title,
        LEFT(COALESCE(awt.description, awt.name), 200) as snippet,
        ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) as rank,
        'workflow_template'::text as content_type,
        awt.created_at,
        jsonb_build_object(
          'category', awt.category,
          'visibility', awt.visibility,
          'tags', awt.tags,
          'usage_count', awt.usage_count,
          'public_id', awt.public_id
        ) as additional_data
      FROM ai_workflow_templates awt
      WHERE awt.search_vector @@ plainto_tsquery('english', search_query)
        AND awt.is_deleted = false
        AND awt.is_active = true
        AND ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Learning goal search
    IF table_name = 'learning_goal' THEN
      RETURN QUERY
      SELECT 
        'learning_goal'::text as table_name,
        lg.id as record_id,
        CONCAT(lg.goal_type, ' Goal') as title,
        CONCAT('Target: ', lg.target_value, ' - Status: ', lg.status) as snippet,
        ts_rank(lg.search_vector, plainto_tsquery('english', search_query)) as rank,
        'learning_goal'::text as content_type,
        lg.created_at,
        jsonb_build_object(
          'goal_type', lg.goal_type,
          'target_value', lg.target_value,
          'current_value', lg.current_value,
          'status', lg.status,
          'reward_type', lg.reward_type,
          'public_id', lg.public_id
        ) as additional_data
      FROM learning_goal lg
      WHERE lg.search_vector @@ plainto_tsquery('english', search_query)
        AND lg.is_deleted = false
        AND ts_rank(lg.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(lg.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Classroom assignment search
    IF table_name = 'classroom_assignment' THEN
      RETURN QUERY
      SELECT 
        'classroom_assignment'::text as table_name,
        ca.id as record_id,
        ca.title as title,
        LEFT(COALESCE(ca.description, ca.title), 200) as snippet,
        ts_rank(ca.search_vector, plainto_tsquery('english', search_query)) as rank,
        'assignment'::text as content_type,
        ca.created_at,
        jsonb_build_object(
          'classroom_id', ca.classroom_id,
          'due_date', ca.due_date,
          'max_score', ca.max_score,
          'submission_type', ca.submission_type,
          'public_id', ca.public_id
        ) as additional_data
      FROM classroom_assignment ca
      WHERE ca.search_vector @@ plainto_tsquery('english', search_query)
        AND ca.is_deleted = false
        AND ts_rank(ca.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(ca.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Classroom posts search
    IF table_name = 'classroom_posts' THEN
      RETURN QUERY
      SELECT 
        'classroom_posts'::text as table_name,
        cp.id as record_id,
        LEFT(cp.content, 50) as title,
        LEFT(cp.content, 200) as snippet,
        ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) as rank,
        'classroom_post'::text as content_type,
        cp.created_at,
        jsonb_build_object(
          'session_id', cp.session_id,
          'user_id', cp.user_id,
          'public_id', cp.public_id
        ) as additional_data
      FROM classroom_posts cp
      WHERE cp.search_vector @@ plainto_tsquery('english', search_query)
        AND cp.is_deleted = false
        AND ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cp.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Course chapter search
    IF table_name = 'course_chapter' THEN
      RETURN QUERY
      SELECT 
        'course_chapter'::text as table_name,
        cc.id as record_id,
        cc.title as title,
        LEFT(COALESCE(cc.description, cc.title), 200) as snippet,
        ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) as rank,
        'chapter'::text as content_type,
        cc.created_at,
        jsonb_build_object(
          'lesson_id', cc.lesson_id,
          'start_time_sec', cc.start_time_sec,
          'end_time_sec', cc.end_time_sec,
          'order_index', cc.order_index
        ) as additional_data
      FROM course_chapter cc
      WHERE cc.search_vector @@ plainto_tsquery('english', search_query)
        AND cc.is_deleted = false
        AND ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cc.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Mistake book search
    IF table_name = 'mistake_book' THEN
      RETURN QUERY
      SELECT 
        'mistake_book'::text as table_name,
        mb.id as record_id,
        LEFT(mb.mistake_content, 50) as title,
        LEFT(COALESCE(mb.analysis, mb.mistake_content), 200) as snippet,
        ts_rank(mb.search_vector, plainto_tsquery('english', search_query)) as rank,
        'mistake'::text as content_type,
        mb.created_at,
        jsonb_build_object(
          'user_id', mb.user_id,
          'course_id', mb.course_id,
          'lesson_id', mb.lesson_id,
          'source_type', mb.source_type,
          'knowledge_points', mb.knowledge_points,
          'public_id', mb.public_id
        ) as additional_data
      FROM mistake_book mb
      WHERE mb.search_vector @@ plainto_tsquery('english', search_query)
        AND mb.is_deleted = false
        AND ts_rank(mb.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(mb.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Tutoring note search
    IF table_name = 'tutoring_note' THEN
      RETURN QUERY
      SELECT 
        'tutoring_note'::text as table_name,
        tn.id as record_id,
        COALESCE(tn.title, 'Untitled Note') as title,
        LEFT(COALESCE(tn.body, tn.title, 'No content'), 200) as snippet,
        ts_rank(tn.search_vector, plainto_tsquery('english', search_query)) as rank,
        'tutoring_note'::text as content_type,
        tn.created_at,
        jsonb_build_object(
          'owner_id', tn.owner_id,
          'public_id', tn.public_id
        ) as additional_data
      FROM tutoring_note tn
      WHERE tn.search_vector @@ plainto_tsquery('english', search_query)
        AND tn.is_deleted = false
        AND ts_rank(tn.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(tn.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community quiz search
    IF table_name = 'community_quiz' THEN
      RETURN QUERY
      SELECT 
        'community_quiz'::text as table_name,
        cq.id as record_id,
        cq.title as title,
        LEFT(COALESCE(cq.description, cq.title), 200) as snippet,
        ts_rank(cq.search_vector, plainto_tsquery('english', search_query)) as rank,
        'quiz'::text as content_type,
        cq.created_at,
        jsonb_build_object(
          'slug', cq.slug,
          'author_id', cq.author_id,
          'difficulty', cq.difficulty,
          'visibility', cq.visibility,
          'tags', cq.tags,
          'public_id', cq.public_id
        ) as additional_data
      FROM community_quiz cq
      WHERE cq.search_vector @@ plainto_tsquery('english', search_query)
        AND cq.is_deleted = false
        AND cq.visibility = 'public'
        AND ts_rank(cq.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cq.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
    -- Community quiz question search
    IF table_name = 'community_quiz_question' THEN
      RETURN QUERY
      SELECT 
        'community_quiz_question'::text as table_name,
        cqq.id as record_id,
        LEFT(cqq.question_text, 50) as title,
        LEFT(COALESCE(cqq.explanation, cqq.question_text), 200) as snippet,
        ts_rank(cqq.search_vector, plainto_tsquery('english', search_query)) as rank,
        'quiz_question'::text as content_type,
        cq.created_at,
        jsonb_build_object(
          'quiz_id', cqq.quiz_id,
          'question_type', cqq.question_type,
          'options', cqq.options,
          'public_id', cqq.public_id
        ) as additional_data
      FROM community_quiz_question cqq
      JOIN community_quiz cq ON cqq.quiz_id = cq.id
      WHERE cqq.search_vector @@ plainto_tsquery('english', search_query)
        AND cq.visibility = 'public'
        AND cq.is_deleted = false
        AND ts_rank(cqq.search_vector, plainto_tsquery('english', search_query)) >= min_rank
      ORDER BY ts_rank(cqq.search_vector, plainto_tsquery('english', search_query)) DESC
      LIMIT max_results;
    END IF;
    
  END LOOP;
END;
$$;

-- =========================
-- 2. SPECIALIZED SEARCH FUNCTIONS
-- =========================

-- Search specifically for AI workflow templates
CREATE OR REPLACE FUNCTION search_workflow_templates(
  search_query text,
  template_category text DEFAULT NULL,
  template_visibility text DEFAULT NULL,
  max_results integer DEFAULT 20
) RETURNS TABLE (
  template_id bigint,
  public_id uuid,
  name text,
  description text,
  category text,
  visibility text,
  tags text[],
  usage_count integer,
  rank real
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    awt.id as template_id,
    awt.public_id,
    awt.name,
    awt.description,
    awt.category,
    awt.visibility,
    awt.tags,
    awt.usage_count,
    ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM ai_workflow_templates awt
  WHERE awt.search_vector @@ plainto_tsquery('english', search_query)
    AND awt.is_deleted = false
    AND awt.is_active = true
    AND (template_category IS NULL OR awt.category = template_category)
    AND (template_visibility IS NULL OR awt.visibility = template_visibility)
  ORDER BY ts_rank(awt.search_vector, plainto_tsquery('english', search_query)) DESC
  LIMIT max_results;
END;
$$;

-- Search specifically for learning content (courses, lessons, notes, etc.)
CREATE OR REPLACE FUNCTION search_learning_content(
  search_query text,
  content_types text[] DEFAULT ARRAY['course', 'course_lesson', 'course_notes', 'course_chapter', 'mistake_book'],
  max_results integer DEFAULT 30
) RETURNS TABLE (
  content_type text,
  content_id bigint,
  title text,
  snippet text,
  rank real,
  metadata jsonb
) LANGUAGE plpgsql AS $$
DECLARE
  content_type text;
BEGIN
  FOREACH content_type IN ARRAY content_types
  LOOP
    IF content_type = 'course' THEN
      RETURN QUERY
      SELECT 
        'course'::text,
        c.id,
        c.title,
        LEFT(COALESCE(c.description, c.title), 200),
        ts_rank(c.search_vector, plainto_tsquery('english', search_query)),
        jsonb_build_object('level', c.level, 'category', c.category, 'is_free', c.is_free)
      FROM course c
      WHERE c.search_vector @@ plainto_tsquery('english', search_query)
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
      ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', search_query)) DESC;
    END IF;
    
    IF content_type = 'course_lesson' THEN
      RETURN QUERY
      SELECT 
        'course_lesson'::text,
        cl.id,
        cl.title,
        LEFT(COALESCE(cl.description, cl.title), 200),
        ts_rank(cl.search_vector, plainto_tsquery('english', search_query)),
        jsonb_build_object('kind', cl.kind, 'duration_sec', cl.duration_sec)
      FROM course_lesson cl
      JOIN course c ON cl.course_id = c.id
      WHERE cl.search_vector @@ plainto_tsquery('english', search_query)
        AND cl.is_deleted = false
        AND c.is_deleted = false
        AND c.status = 'active'
        AND c.visibility = 'public'
      ORDER BY ts_rank(cl.search_vector, plainto_tsquery('english', search_query)) DESC;
    END IF;
    
    -- Add other content types as needed...
  END LOOP;
  
  -- Limit total results
  RETURN QUERY
  SELECT * FROM (
    SELECT DISTINCT ON (content_type, content_id) *
    FROM search_learning_content
    ORDER BY content_type, content_id, rank DESC
  ) sub
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$;

-- =========================
-- 3. SMART SEARCH WITH CONTEXT
-- =========================

-- Context-aware search that considers user's role and access
CREATE OR REPLACE FUNCTION smart_contextual_search(
  search_query text,
  user_id_param bigint DEFAULT NULL,
  user_role_param text DEFAULT 'student',
  search_context text DEFAULT 'general', -- 'learning', 'teaching', 'admin', 'general'
  max_results integer DEFAULT 20
) RETURNS TABLE (
  table_name text,
  record_id bigint,
  title text,
  snippet text,
  rank real,
  content_type text,
  relevance_score real,
  additional_data jsonb
) LANGUAGE plpgsql AS $$
DECLARE
  tables_to_search text[];
BEGIN
  -- Determine tables to search based on context and role
  CASE search_context
    WHEN 'learning' THEN
      tables_to_search := ARRAY['course', 'course_lesson', 'course_notes', 'course_chapter', 'mistake_book', 'learning_goal'];
    WHEN 'teaching' THEN
      tables_to_search := ARRAY['course', 'course_lesson', 'classroom', 'classroom_assignment', 'ai_workflow_templates'];
    WHEN 'admin' THEN
      tables_to_search := ARRAY['profiles', 'course', 'community_post', 'announcements', 'ai_workflow_templates'];
    ELSE -- 'general'
      tables_to_search := ARRAY['course', 'community_post', 'community_group', 'profiles'];
  END CASE;

  -- Add role-specific tables
  IF user_role_param = 'tutor' THEN
    tables_to_search := tables_to_search || ARRAY['tutoring_tutors', 'tutoring_note'];
  END IF;

  -- Perform enhanced universal search with context
  RETURN QUERY
  SELECT 
    eus.table_name,
    eus.record_id,
    eus.title,
    eus.snippet,
    eus.rank,
    eus.content_type,
    -- Calculate relevance score based on context
    CASE 
      WHEN search_context = 'learning' AND eus.content_type IN ('course', 'lesson', 'note') THEN eus.rank * 1.5
      WHEN search_context = 'teaching' AND eus.content_type IN ('classroom', 'assignment') THEN eus.rank * 1.3
      ELSE eus.rank
    END as relevance_score,
    eus.additional_data
  FROM universal_search_enhanced(search_query, tables_to_search, max_results * 2) eus
  ORDER BY relevance_score DESC
  LIMIT max_results;
END;
$$;
