-- =========================
-- STUDIFY COMPREHENSIVE TSVECTOR SEARCH SYSTEM - PART 1
-- Created: 2025-09-23
-- Purpose: 为Studify重要表添加全文搜索功能
-- =========================

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =========================
-- 1. PROFILES SEARCH SYSTEM
-- =========================

-- Add tsvector column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update profiles search vector
CREATE OR REPLACE FUNCTION update_profiles_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.role, '')), 'D') ||
    -- Extract preferences text
    setweight(to_tsvector('english', coalesce(
      (NEW.preferences->>'onboarding')::text || ' ' ||
      (NEW.preferences->'interests'->>'broadField')::text || ' ' ||
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(NEW.preferences->'interests'->'subFields')), 
        ' '
      ), ''
    )), 'C');
  
  RETURN NEW;
END;
$$;

-- Create trigger for profiles
DROP TRIGGER IF EXISTS profiles_search_vector_trigger ON profiles;
CREATE TRIGGER profiles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_search_vector();

-- Create GIN index for profiles search
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector 
ON profiles USING gin(search_vector);

-- =========================
-- 2. COURSE SEARCH SYSTEM
-- =========================

-- Add tsvector column to course table
ALTER TABLE course ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update course search vector
CREATE OR REPLACE FUNCTION update_course_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.level, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.language, '')), 'D') ||
    -- Process requirements array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.requirements, ' '), ''
    )), 'C') ||
    -- Process learning_objectives array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.learning_objectives, ' '), ''
    )), 'C') ||
    -- Process tags array
    setweight(to_tsvector('english', coalesce(
      array_to_string(NEW.tags, ' '), ''
    )), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for course
DROP TRIGGER IF EXISTS course_search_vector_trigger ON course;
CREATE TRIGGER course_search_vector_trigger
  BEFORE INSERT OR UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION update_course_search_vector();

-- Create GIN index for course search
CREATE INDEX IF NOT EXISTS idx_course_search_vector 
ON course USING gin(search_vector);

-- =========================
-- 3. COURSE LESSON SEARCH SYSTEM
-- =========================

-- Add tsvector column to course_lesson table
ALTER TABLE course_lesson ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update course_lesson search vector
CREATE OR REPLACE FUNCTION update_course_lesson_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.transcript, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.kind, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for course_lesson
DROP TRIGGER IF EXISTS course_lesson_search_vector_trigger ON course_lesson;
CREATE TRIGGER course_lesson_search_vector_trigger
  BEFORE INSERT OR UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION update_course_lesson_search_vector();

-- Create GIN index for course_lesson search
CREATE INDEX IF NOT EXISTS idx_course_lesson_search_vector 
ON course_lesson USING gin(search_vector);

-- =========================
-- 4. COMMUNITY COMMENT SEARCH SYSTEM
-- =========================

-- Add tsvector column to community_comment table
ALTER TABLE community_comment ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update community_comment search vector
CREATE OR REPLACE FUNCTION update_community_comment_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'A');
  
  RETURN NEW;
END;
$$;

-- Create trigger for community_comment
DROP TRIGGER IF EXISTS community_comment_search_vector_trigger ON community_comment;
CREATE TRIGGER community_comment_search_vector_trigger
  BEFORE INSERT OR UPDATE ON community_comment
  FOR EACH ROW EXECUTE FUNCTION update_community_comment_search_vector();

-- Create GIN index for community_comment search
CREATE INDEX IF NOT EXISTS idx_community_comment_search_vector 
ON community_comment USING gin(search_vector);

-- =========================
-- 5. CLASSROOM SEARCH SYSTEM
-- =========================

-- Add tsvector column to classroom table
ALTER TABLE classroom ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update classroom search vector
CREATE OR REPLACE FUNCTION update_classroom_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.class_code, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.status, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Create trigger for classroom
DROP TRIGGER IF EXISTS classroom_search_vector_trigger ON classroom;
CREATE TRIGGER classroom_search_vector_trigger
  BEFORE INSERT OR UPDATE ON classroom
  FOR EACH ROW EXECUTE FUNCTION update_classroom_search_vector();

-- Create GIN index for classroom search
CREATE INDEX IF NOT EXISTS idx_classroom_search_vector 
ON classroom USING gin(search_vector);
