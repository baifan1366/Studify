-- =========================
-- STUDIFY COMPREHENSIVE TSVECTOR SEARCH SYSTEM - PART 2
-- Created: 2025-09-23
-- Purpose: 继续添加其他重要表的搜索功能
-- =========================

-- =========================
-- 6. COMMUNITY GROUP SEARCH SYSTEM
-- =========================

-- Add tsvector column to community_group table
ALTER TABLE community_group ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update community_group search vector
CREATE OR REPLACE FUNCTION update_community_group_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.slug, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.visibility, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for community_group
DROP TRIGGER IF EXISTS community_group_search_vector_trigger ON community_group;
CREATE TRIGGER community_group_search_vector_trigger
  BEFORE INSERT OR UPDATE ON community_group
  FOR EACH ROW EXECUTE FUNCTION update_community_group_search_vector();

-- Create GIN index for community_group search
CREATE INDEX IF NOT EXISTS idx_community_group_search_vector 
ON community_group USING gin(search_vector);

-- =========================
-- 7. AI AGENT SEARCH SYSTEM
-- =========================

-- Add tsvector column to ai_agent table
ALTER TABLE ai_agent ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update ai_agent search vector
CREATE OR REPLACE FUNCTION update_ai_agent_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.purpose, '')), 'B') ||
    -- Extract config JSON as text for search
    setweight(to_tsvector('english', coalesce(NEW.config::text, '')), 'C');
  
  RETURN NEW;
END;
$$;

-- Create trigger for ai_agent
DROP TRIGGER IF EXISTS ai_agent_search_vector_trigger ON ai_agent;
CREATE TRIGGER ai_agent_search_vector_trigger
  BEFORE INSERT OR UPDATE ON ai_agent
  FOR EACH ROW EXECUTE FUNCTION update_ai_agent_search_vector();

-- Create GIN index for ai_agent search
CREATE INDEX IF NOT EXISTS idx_ai_agent_search_vector 
ON ai_agent USING gin(search_vector);

-- =========================
-- 8. COURSE NOTES SEARCH SYSTEM
-- =========================

-- Add tsvector column to course_notes table
ALTER TABLE course_notes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update course_notes search vector
CREATE OR REPLACE FUNCTION update_course_notes_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'C');
  
  RETURN NEW;
END;
$$;

-- Create trigger for course_notes
DROP TRIGGER IF EXISTS course_notes_search_vector_trigger ON course_notes;
CREATE TRIGGER course_notes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON course_notes
  FOR EACH ROW EXECUTE FUNCTION update_course_notes_search_vector();

-- Create GIN index for course_notes search
CREATE INDEX IF NOT EXISTS idx_course_notes_search_vector 
ON course_notes USING gin(search_vector);

-- =========================
-- 9. TUTORING TUTORS SEARCH SYSTEM
-- =========================

-- Add tsvector column to tutoring_tutors table
ALTER TABLE tutoring_tutors ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update tutoring_tutors search vector
CREATE OR REPLACE FUNCTION update_tutoring_tutors_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.qualifications, '')), 'B') ||
    -- Process subjects array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.subjects, ' '), ''
    )), 'A');
  
  RETURN NEW;
END;
$$;

-- Create trigger for tutoring_tutors
DROP TRIGGER IF EXISTS tutoring_tutors_search_vector_trigger ON tutoring_tutors;
CREATE TRIGGER tutoring_tutors_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tutoring_tutors
  FOR EACH ROW EXECUTE FUNCTION update_tutoring_tutors_search_vector();

-- Create GIN index for tutoring_tutors search
CREATE INDEX IF NOT EXISTS idx_tutoring_tutors_search_vector 
ON tutoring_tutors USING gin(search_vector);

-- =========================
-- 10. CLASSROOM LIVE SESSION SEARCH SYSTEM
-- =========================

-- Add tsvector column to classroom_live_session table
ALTER TABLE classroom_live_session ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update classroom_live_session search vector
CREATE OR REPLACE FUNCTION update_classroom_live_session_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.status, '')), 'C');
  
  RETURN NEW;
END;
$$;

-- Create trigger for classroom_live_session
DROP TRIGGER IF EXISTS classroom_live_session_search_vector_trigger ON classroom_live_session;
CREATE TRIGGER classroom_live_session_search_vector_trigger
  BEFORE INSERT OR UPDATE ON classroom_live_session
  FOR EACH ROW EXECUTE FUNCTION update_classroom_live_session_search_vector();

-- Create GIN index for classroom_live_session search
CREATE INDEX IF NOT EXISTS idx_classroom_live_session_search_vector 
ON classroom_live_session USING gin(search_vector);

-- =========================
-- 11. COURSE REVIEWS SEARCH SYSTEM
-- =========================

-- Add tsvector column to course_reviews table
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update course_reviews search vector
CREATE OR REPLACE FUNCTION update_course_reviews_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.comment, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.rating::text, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for course_reviews
DROP TRIGGER IF EXISTS course_reviews_search_vector_trigger ON course_reviews;
CREATE TRIGGER course_reviews_search_vector_trigger
  BEFORE INSERT OR UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION update_course_reviews_search_vector();

-- Create GIN index for course_reviews search
CREATE INDEX IF NOT EXISTS idx_course_reviews_search_vector 
ON course_reviews USING gin(search_vector);

-- =========================
-- 12. COURSE QUIZ QUESTIONS SEARCH SYSTEM
-- =========================

-- Add tsvector column to course_quiz_question table
ALTER TABLE course_quiz_question ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update course_quiz_question search vector
CREATE OR REPLACE FUNCTION update_course_quiz_question_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.question_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.explanation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.question_type, '')), 'C') ||
    -- Process options array if it exists
    setweight(to_tsvector('english', coalesce(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(NEW.options)), 
        ' '
      ), ''
    )), 'B');
  
  RETURN NEW;
END;
$$;

-- Create trigger for course_quiz_question
DROP TRIGGER IF EXISTS course_quiz_question_search_vector_trigger ON course_quiz_question;
CREATE TRIGGER course_quiz_question_search_vector_trigger
  BEFORE INSERT OR UPDATE ON course_quiz_question
  FOR EACH ROW EXECUTE FUNCTION update_course_quiz_question_search_vector();

-- Create GIN index for course_quiz_question search
CREATE INDEX IF NOT EXISTS idx_course_quiz_question_search_vector 
ON course_quiz_question USING gin(search_vector);

-- =========================
-- 13. ANNOUNCEMENTS SEARCH SYSTEM
-- =========================

-- Add tsvector column to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update announcements search vector
CREATE OR REPLACE FUNCTION update_announcements_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.message, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.status, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for announcements
DROP TRIGGER IF EXISTS announcements_search_vector_trigger ON announcements;
CREATE TRIGGER announcements_search_vector_trigger
  BEFORE INSERT OR UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_search_vector();

-- Create GIN index for announcements search
CREATE INDEX IF NOT EXISTS idx_announcements_search_vector 
ON announcements USING gin(search_vector);
