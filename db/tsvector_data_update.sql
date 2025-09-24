-- =========================
-- STUDIFY TSVECTOR DATA INITIALIZATION
-- Created: 2025-09-23
-- Purpose: 批量更新现有数据的tsvector字段
-- =========================

-- =========================
-- BATCH UPDATE EXISTING DATA
-- =========================

-- 1. Update profiles search vectors
UPDATE profiles SET search_vector = 
  setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(email, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(role, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(
    (preferences->>'onboarding')::text || ' ' ||
    (preferences->'interests'->>'broadField')::text || ' ' ||
    array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(preferences->'interests'->'subFields')), 
      ' '
    ), ''
  )), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 2. Update course search vectors
UPDATE course SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(level, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(language, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(requirements, ' '), ''
  )), 'C') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(learning_objectives, ' '), ''
  )), 'C') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(tags, ' '), ''
  )), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 3. Update course_lesson search vectors
UPDATE course_lesson SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(transcript, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(kind, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 4. Update community_comment search vectors
UPDATE community_comment SET search_vector = 
  setweight(to_tsvector('english', coalesce(body, '')), 'A')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 5. Update classroom search vectors
UPDATE classroom SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(class_code, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(status, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 6. Update community_group search vectors
UPDATE community_group SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(slug, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(visibility, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 7. Update ai_agent search vectors
UPDATE ai_agent SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(purpose, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(config::text, '')), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 8. Update course_notes search vectors
UPDATE course_notes SET search_vector = 
  setweight(to_tsvector('english', coalesce(content, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(tags, ' '), ''
  )), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 9. Update tutoring_tutors search vectors
UPDATE tutoring_tutors SET search_vector = 
  setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(qualifications, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(subjects, ' '), ''
  )), 'A')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 10. Update classroom_live_session search vectors
UPDATE classroom_live_session SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(status, '')), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 11. Update course_reviews search vectors
UPDATE course_reviews SET search_vector = 
  setweight(to_tsvector('english', coalesce(comment, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(rating::text, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 12. Update course_quiz_question search vectors
UPDATE course_quiz_question SET search_vector = 
  setweight(to_tsvector('english', coalesce(question_text, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(explanation, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(question_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(options)), 
      ' '
    ), ''
  )), 'B')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- 13. Update announcements search vectors
UPDATE announcements SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(message, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(status, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- =========================
-- VERIFICATION QUERIES
-- =========================

-- Check which tables have tsvector data
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) as with_search_vector,
  ROUND(
    100.0 * COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) / COUNT(*),
    2
  ) as percentage_complete
FROM profiles
WHERE is_deleted = false

UNION ALL

SELECT 
  'course' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) as with_search_vector,
  ROUND(
    100.0 * COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) / COUNT(*),
    2
  ) as percentage_complete
FROM course
WHERE is_deleted = false

UNION ALL

SELECT 
  'course_lesson' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) as with_search_vector,
  ROUND(
    100.0 * COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) / COUNT(*),
    2
  ) as percentage_complete
FROM course_lesson
WHERE is_deleted = false

UNION ALL

SELECT 
  'community_post' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) as with_search_vector,
  ROUND(
    100.0 * COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) / COUNT(*),
    2
  ) as percentage_complete
FROM community_post
WHERE is_deleted = false

UNION ALL

SELECT 
  'community_comment' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) as with_search_vector,
  ROUND(
    100.0 * COUNT(CASE WHEN search_vector IS NOT NULL AND search_vector != ''::tsvector THEN 1 END) / COUNT(*),
    2
  ) as percentage_complete
FROM community_comment
WHERE is_deleted = false

ORDER BY table_name;

-- =========================
-- TEST SEARCH QUERIES
-- =========================

-- Test universal search
SELECT 
  table_name,
  record_id,
  title,
  LEFT(snippet, 100) as short_snippet,
  rank,
  content_type
FROM universal_search('javascript programming', ARRAY['course', 'course_lesson', 'profiles'], 10, 0.1)
ORDER BY rank DESC;

-- Test user search
SELECT 
  display_name,
  role,
  LEFT(bio, 100) as bio_snippet,
  rank
FROM search_users('teacher math', NULL, 5)
ORDER BY rank DESC;

-- Test course search
SELECT 
  title,
  category,
  level,
  is_free,
  rank
FROM search_courses('web development', NULL, NULL, 5)
ORDER BY rank DESC;
