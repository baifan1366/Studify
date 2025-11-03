-- ============================================================================
-- ALL-IN-ONE SAFE MIGRATION: Complete Search Vector Fix
-- ============================================================================
-- This script can be run independently and is completely safe to re-run
-- It will:
-- 1. Add missing search_vector columns (if not exist)
-- 2. Create indexes (if not exist)
-- 3. Create update functions (or replace if exist)
-- 4. Create triggers (or replace if exist)
-- 5. Populate all search_vectors

-- ============================================================================
-- PART 1: Add Columns and Indexes
-- ============================================================================

-- profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'search_vector') THEN
    ALTER TABLE profiles ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING gin(search_vector);

-- course
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course' AND column_name = 'search_vector') THEN
    ALTER TABLE course ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_course_search_vector ON course USING gin(search_vector);

-- course_lesson
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_lesson' AND column_name = 'search_vector') THEN
    ALTER TABLE course_lesson ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_course_lesson_search_vector ON course_lesson USING gin(search_vector);

-- community_post
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_post' AND column_name = 'search_vector') THEN
    ALTER TABLE community_post ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_community_post_search_vector ON community_post USING gin(search_vector);

-- community_comment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_comment' AND column_name = 'search_vector') THEN
    ALTER TABLE community_comment ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_community_comment_search_vector ON community_comment USING gin(search_vector);

-- classroom
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classroom' AND column_name = 'search_vector') THEN
    ALTER TABLE classroom ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_classroom_search_vector ON classroom USING gin(search_vector);

-- community_group
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_group' AND column_name = 'search_vector') THEN
    ALTER TABLE community_group ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_community_group_search_vector ON community_group USING gin(search_vector);

-- ai_agent
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent' AND column_name = 'search_vector') THEN
    ALTER TABLE ai_agent ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ai_agent_search_vector ON ai_agent USING gin(search_vector);

-- course_notes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_notes' AND column_name = 'search_vector') THEN
    ALTER TABLE course_notes ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_course_notes_search_vector ON course_notes USING gin(search_vector);

-- tutoring_tutors
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tutoring_tutors' AND column_name = 'search_vector') THEN
    ALTER TABLE tutoring_tutors ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_tutoring_tutors_search_vector ON tutoring_tutors USING gin(search_vector);

-- course_reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_reviews' AND column_name = 'search_vector') THEN
    ALTER TABLE course_reviews ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_course_reviews_search_vector ON course_reviews USING gin(search_vector);

-- announcements
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'search_vector') THEN
    ALTER TABLE announcements ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_announcements_search_vector ON announcements USING gin(search_vector);

-- ai_workflow_templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_workflow_templates' AND column_name = 'search_vector') THEN
    ALTER TABLE ai_workflow_templates ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ai_workflow_templates_search_vector ON ai_workflow_templates USING gin(search_vector);

-- learning_goal
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_goal' AND column_name = 'search_vector') THEN
    ALTER TABLE learning_goal ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_learning_goal_search_vector ON learning_goal USING gin(search_vector);

-- classroom_assignment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classroom_assignment' AND column_name = 'search_vector') THEN
    ALTER TABLE classroom_assignment ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_classroom_assignment_search_vector ON classroom_assignment USING gin(search_vector);

-- classroom_posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classroom_posts' AND column_name = 'search_vector') THEN
    ALTER TABLE classroom_posts ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_classroom_posts_search_vector ON classroom_posts USING gin(search_vector);

-- course_chapter
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_chapter' AND column_name = 'search_vector') THEN
    ALTER TABLE course_chapter ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_course_chapter_search_vector ON course_chapter USING gin(search_vector);

-- mistake_book
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mistake_book' AND column_name = 'search_vector') THEN
    ALTER TABLE mistake_book ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_mistake_book_search_vector ON mistake_book USING gin(search_vector);

-- tutoring_note
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tutoring_note' AND column_name = 'search_vector') THEN
    ALTER TABLE tutoring_note ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_tutoring_note_search_vector ON tutoring_note USING gin(search_vector);

-- community_quiz
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_quiz' AND column_name = 'search_vector') THEN
    ALTER TABLE community_quiz ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_community_quiz_search_vector ON community_quiz USING gin(search_vector);

-- community_quiz_question
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_quiz_question' AND column_name = 'search_vector') THEN
    ALTER TABLE community_quiz_question ADD COLUMN search_vector tsvector;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_community_quiz_question_search_vector ON community_quiz_question USING gin(search_vector);

-- ============================================================================
-- PART 2: Create/Replace Update Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profiles_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.role, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_course_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.requirements, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.learning_objectives, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.level, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_course_lesson_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.transcript, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.kind, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_community_comment_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', coalesce(NEW.body, '')), 'A');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_classroom_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: Create/Replace Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS profiles_search_vector_trigger ON profiles;
CREATE TRIGGER profiles_search_vector_trigger 
BEFORE INSERT OR UPDATE ON profiles 
FOR EACH ROW EXECUTE FUNCTION update_profiles_search_vector();

DROP TRIGGER IF EXISTS course_search_vector_trigger ON course;
CREATE TRIGGER course_search_vector_trigger 
BEFORE INSERT OR UPDATE ON course 
FOR EACH ROW EXECUTE FUNCTION update_course_search_vector();

DROP TRIGGER IF EXISTS course_lesson_search_vector_trigger ON course_lesson;
CREATE TRIGGER course_lesson_search_vector_trigger 
BEFORE INSERT OR UPDATE ON course_lesson 
FOR EACH ROW EXECUTE FUNCTION update_course_lesson_search_vector();

DROP TRIGGER IF EXISTS community_comment_search_vector_trigger ON community_comment;
CREATE TRIGGER community_comment_search_vector_trigger 
BEFORE INSERT OR UPDATE ON community_comment 
FOR EACH ROW EXECUTE FUNCTION update_community_comment_search_vector();

DROP TRIGGER IF EXISTS classroom_search_vector_trigger ON classroom;
CREATE TRIGGER classroom_search_vector_trigger 
BEFORE INSERT OR UPDATE ON classroom 
FOR EACH ROW EXECUTE FUNCTION update_classroom_search_vector();

-- ============================================================================
-- PART 4: Populate All Search Vectors
-- ============================================================================

UPDATE profiles SET search_vector = 
  setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(role, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(email, '')), 'D')
WHERE search_vector IS NULL;

UPDATE course SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(requirements, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(learning_objectives, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(level, '')), 'D')
WHERE search_vector IS NULL;

UPDATE course_lesson SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(transcript, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(kind, '')), 'D')
WHERE search_vector IS NULL;

UPDATE community_post SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B')
WHERE search_vector IS NULL;

UPDATE community_comment SET search_vector = 
  setweight(to_tsvector('english', coalesce(body, '')), 'A')
WHERE search_vector IS NULL;

UPDATE classroom SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
WHERE search_vector IS NULL;

UPDATE community_group SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(slug, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(visibility, '')), 'D')
WHERE search_vector IS NULL;

UPDATE ai_agent SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(purpose, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(config::text, '')), 'C')
WHERE search_vector IS NULL;

UPDATE course_notes SET search_vector = 
  setweight(to_tsvector('english', coalesce(content, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL;

UPDATE tutoring_tutors SET search_vector = 
  setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(qualifications, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(subjects, ' '), '')), 'A')
WHERE search_vector IS NULL;

UPDATE course_reviews SET search_vector = 
  setweight(to_tsvector('english', coalesce(comment, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(rating::text, '')), 'D')
WHERE search_vector IS NULL;

UPDATE announcements SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(message, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(status, '')), 'D')
WHERE search_vector IS NULL;

UPDATE ai_workflow_templates SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(
    (workflow_definition->>'description')::text || ' ' ||
    (workflow_definition->>'purpose')::text, ''
  )), 'C') ||
  setweight(to_tsvector('english', coalesce(visibility, '')), 'D')
WHERE search_vector IS NULL;

UPDATE learning_goal SET search_vector = 
  setweight(to_tsvector('english', coalesce(goal_type, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(status, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(reward_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(target_value::text, '')), 'D')
WHERE search_vector IS NULL;

UPDATE classroom_assignment SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
WHERE search_vector IS NULL;

UPDATE classroom_posts SET search_vector = 
  setweight(to_tsvector('english', coalesce(content, '')), 'A')
WHERE search_vector IS NULL;

UPDATE course_chapter SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
WHERE search_vector IS NULL;

UPDATE mistake_book SET search_vector = 
  setweight(to_tsvector('english', coalesce(mistake_content, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(analysis, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(source_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(knowledge_points, ' '), '')), 'B')
WHERE search_vector IS NULL;

UPDATE tutoring_note SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B')
WHERE search_vector IS NULL;

UPDATE community_quiz SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(difficulty::text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(visibility, '')), 'D')
WHERE search_vector IS NULL;

UPDATE community_quiz_question SET search_vector = 
  setweight(to_tsvector('english', coalesce(question_text, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(explanation, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(question_type, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(options, ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(correct_answers, ' '), '')), 'C')
WHERE search_vector IS NULL;

-- Done! All search vectors are now set up and populated.
