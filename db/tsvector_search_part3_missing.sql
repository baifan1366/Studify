-- =========================
-- STUDIFY TSVECTOR 搜索系统 - 遗漏表补充
-- Created: 2025-09-23
-- Purpose: 补充之前遗漏的需要搜索功能的表
-- =========================

-- =========================
-- 1. AI WORKFLOW TEMPLATES SEARCH SYSTEM
-- =========================

-- Add tsvector column to ai_workflow_templates table
ALTER TABLE ai_workflow_templates ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update ai_workflow_templates search vector
CREATE OR REPLACE FUNCTION update_ai_workflow_templates_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'C') ||
    -- Extract workflow definition as searchable text
    setweight(to_tsvector('english', coalesce(
      (NEW.workflow_definition->>'description')::text || ' ' ||
      (NEW.workflow_definition->>'purpose')::text, ''
    )), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.visibility, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for ai_workflow_templates
DROP TRIGGER IF EXISTS ai_workflow_templates_search_vector_trigger ON ai_workflow_templates;
CREATE TRIGGER ai_workflow_templates_search_vector_trigger
  BEFORE INSERT OR UPDATE ON ai_workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_ai_workflow_templates_search_vector();

-- Create GIN index for ai_workflow_templates search
CREATE INDEX IF NOT EXISTS idx_ai_workflow_templates_search_vector 
ON ai_workflow_templates USING gin(search_vector);

-- =========================
-- 2. LEARNING GOAL SEARCH SYSTEM
-- =========================

-- Add tsvector column to learning_goal table (from migration)
ALTER TABLE learning_goal ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update learning_goal search vector
CREATE OR REPLACE FUNCTION update_learning_goal_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.goal_type, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.status, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.reward_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.target_value::text, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for learning_goal
DROP TRIGGER IF EXISTS learning_goal_search_vector_trigger ON learning_goal;
CREATE TRIGGER learning_goal_search_vector_trigger
  BEFORE INSERT OR UPDATE ON learning_goal
  FOR EACH ROW EXECUTE FUNCTION update_learning_goal_search_vector();

-- Create GIN index for learning_goal search
CREATE INDEX IF NOT EXISTS idx_learning_goal_search_vector 
ON learning_goal USING gin(search_vector);

-- =========================
-- 3. CLASSROOM ASSIGNMENT SEARCH SYSTEM
-- =========================

-- Add tsvector column to classroom_assignment table
ALTER TABLE classroom_assignment ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update classroom_assignment search vector
CREATE OR REPLACE FUNCTION update_classroom_assignment_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.submission_type, '')), 'C');
  
  RETURN NEW;
END;
$$;

-- Create trigger for classroom_assignment
DROP TRIGGER IF EXISTS classroom_assignment_search_vector_trigger ON classroom_assignment;
CREATE TRIGGER classroom_assignment_search_vector_trigger
  BEFORE INSERT OR UPDATE ON classroom_assignment
  FOR EACH ROW EXECUTE FUNCTION update_classroom_assignment_search_vector();

-- Create GIN index for classroom_assignment search
CREATE INDEX IF NOT EXISTS idx_classroom_assignment_search_vector 
ON classroom_assignment USING gin(search_vector);

-- =========================
-- 4. CLASSROOM POSTS SEARCH SYSTEM
-- =========================

-- Add tsvector column to classroom_posts table
ALTER TABLE classroom_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update classroom_posts search vector
CREATE OR REPLACE FUNCTION update_classroom_posts_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'A');
  
  RETURN NEW;
END;
$$;

-- Create trigger for classroom_posts
DROP TRIGGER IF EXISTS classroom_posts_search_vector_trigger ON classroom_posts;
CREATE TRIGGER classroom_posts_search_vector_trigger
  BEFORE INSERT OR UPDATE ON classroom_posts
  FOR EACH ROW EXECUTE FUNCTION update_classroom_posts_search_vector();

-- Create GIN index for classroom_posts search
CREATE INDEX IF NOT EXISTS idx_classroom_posts_search_vector 
ON classroom_posts USING gin(search_vector);

-- =========================
-- 5. COURSE CHAPTER SEARCH SYSTEM
-- =========================

-- Add tsvector column to course_chapter table
ALTER TABLE course_chapter ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update course_chapter search vector
CREATE OR REPLACE FUNCTION update_course_chapter_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  
  RETURN NEW;
END;
$$;

-- Create trigger for course_chapter
DROP TRIGGER IF EXISTS course_chapter_search_vector_trigger ON course_chapter;
CREATE TRIGGER course_chapter_search_vector_trigger
  BEFORE INSERT OR UPDATE ON course_chapter
  FOR EACH ROW EXECUTE FUNCTION update_course_chapter_search_vector();

-- Create GIN index for course_chapter search
CREATE INDEX IF NOT EXISTS idx_course_chapter_search_vector 
ON course_chapter USING gin(search_vector);

-- =========================
-- 6. MISTAKE BOOK SEARCH SYSTEM
-- =========================

-- Add tsvector column to mistake_book table
ALTER TABLE mistake_book ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update mistake_book search vector
CREATE OR REPLACE FUNCTION update_mistake_book_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.mistake_content, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.analysis, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.source_type, '')), 'C') ||
    -- Process knowledge_points array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.knowledge_points, ' '), ''
    )), 'B');
  
  RETURN NEW;
END;
$$;

-- Create trigger for mistake_book
DROP TRIGGER IF EXISTS mistake_book_search_vector_trigger ON mistake_book;
CREATE TRIGGER mistake_book_search_vector_trigger
  BEFORE INSERT OR UPDATE ON mistake_book
  FOR EACH ROW EXECUTE FUNCTION update_mistake_book_search_vector();

-- Create GIN index for mistake_book search
CREATE INDEX IF NOT EXISTS idx_mistake_book_search_vector 
ON mistake_book USING gin(search_vector);

-- =========================
-- 7. TUTORING NOTE SEARCH SYSTEM
-- =========================

-- Add tsvector column to tutoring_note table
ALTER TABLE tutoring_note ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update tutoring_note search vector
CREATE OR REPLACE FUNCTION update_tutoring_note_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
  
  RETURN NEW;
END;
$$;

-- Create trigger for tutoring_note
DROP TRIGGER IF EXISTS tutoring_note_search_vector_trigger ON tutoring_note;
CREATE TRIGGER tutoring_note_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tutoring_note
  FOR EACH ROW EXECUTE FUNCTION update_tutoring_note_search_vector();

-- Create GIN index for tutoring_note search
CREATE INDEX IF NOT EXISTS idx_tutoring_note_search_vector 
ON tutoring_note USING gin(search_vector);

-- =========================
-- 8. COMMUNITY QUIZ SEARCH SYSTEM  
-- =========================

-- Add tsvector column to community_quiz table
ALTER TABLE community_quiz ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update community_quiz search vector
CREATE OR REPLACE FUNCTION update_community_quiz_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.difficulty::text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.quiz_mode, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.visibility, '')), 'D') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'B');
  
  RETURN NEW;
END;
$$;

-- Create trigger for community_quiz
DROP TRIGGER IF EXISTS community_quiz_search_vector_trigger ON community_quiz;
CREATE TRIGGER community_quiz_search_vector_trigger
  BEFORE INSERT OR UPDATE ON community_quiz
  FOR EACH ROW EXECUTE FUNCTION update_community_quiz_search_vector();

-- Create GIN index for community_quiz search
CREATE INDEX IF NOT EXISTS idx_community_quiz_search_vector 
ON community_quiz USING gin(search_vector);

-- =========================
-- 9. COMMUNITY QUIZ QUESTIONS SEARCH SYSTEM
-- =========================

-- Add tsvector column to community_quiz_question table
ALTER TABLE community_quiz_question ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update community_quiz_question search vector
CREATE OR REPLACE FUNCTION update_community_quiz_question_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.question_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.explanation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.question_type, '')), 'C') ||
    -- Process options array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.options, ' '), ''
    )), 'B') ||
    -- Process correct_answers array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.correct_answers, ' '), ''
    )), 'C');
  
  RETURN NEW;
END;
$$;

-- Create trigger for community_quiz_question
DROP TRIGGER IF EXISTS community_quiz_question_search_vector_trigger ON community_quiz_question;
CREATE TRIGGER community_quiz_question_search_vector_trigger
  BEFORE INSERT OR UPDATE ON community_quiz_question
  FOR EACH ROW EXECUTE FUNCTION update_community_quiz_question_search_vector();

-- Create GIN index for community_quiz_question search
CREATE INDEX IF NOT EXISTS idx_community_quiz_question_search_vector 
ON community_quiz_question USING gin(search_vector);

-- =========================
-- BATCH UPDATE EXISTING DATA FOR NEW TABLES
-- =========================

-- Update ai_workflow_templates search vectors
UPDATE ai_workflow_templates SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(tags, ' '), ''
  )), 'C') ||
  setweight(to_tsvector('english', coalesce(
    (workflow_definition->>'description')::text || ' ' ||
    (workflow_definition->>'purpose')::text, ''
  )), 'C') ||
  setweight(to_tsvector('english', coalesce(visibility, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update learning_goal search vectors
UPDATE learning_goal SET search_vector = 
  setweight(to_tsvector('english', coalesce(goal_type, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(status, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(reward_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(target_value::text, '')), 'D')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update classroom_assignment search vectors
UPDATE classroom_assignment SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(submission_type, '')), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update classroom_posts search vectors
UPDATE classroom_posts SET search_vector = 
  setweight(to_tsvector('english', coalesce(content, '')), 'A')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update course_chapter search vectors
UPDATE course_chapter SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update mistake_book search vectors
UPDATE mistake_book SET search_vector = 
  setweight(to_tsvector('english', coalesce(mistake_content, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(analysis, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(source_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(knowledge_points, ' '), ''
  )), 'B')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update tutoring_note search vectors
UPDATE tutoring_note SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update community_quiz search vectors
UPDATE community_quiz SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(difficulty::text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(quiz_mode, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(visibility, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(tags, ' '), ''
  )), 'B')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;

-- Update community_quiz_question search vectors
UPDATE community_quiz_question SET search_vector = 
  setweight(to_tsvector('english', coalesce(question_text, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(explanation, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(question_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(options, ' '), ''
  )), 'B') ||
  setweight(to_tsvector('english', coalesce(
    array_to_string(correct_answers, ' '), ''
  )), 'C')
WHERE search_vector IS NULL OR search_vector = ''::tsvector;
