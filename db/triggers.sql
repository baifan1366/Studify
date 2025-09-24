-- =========================
-- CONSOLIDATED DATABASE TRIGGERS
-- =========================

-- =========================
-- PROFILE TRIGGERS
-- =========================

-- Trigger function for profile embedding
CREATE OR REPLACE FUNCTION trigger_profile_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if relevant fields have changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.display_name IS DISTINCT FROM OLD.display_name OR
       NEW.full_name IS DISTINCT FROM OLD.full_name OR
       NEW.bio IS DISTINCT FROM OLD.bio OR
       NEW.role IS DISTINCT FROM OLD.role OR
       NEW.preferences IS DISTINCT FROM OLD.preferences
     )) THEN
    
    -- Queue for embedding with high priority for profiles
    PERFORM queue_for_embedding_qstash('profile', NEW.id, 3);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Profile embedding trigger (re-enabled from migration)
CREATE TRIGGER profile_embedding_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_profile_embedding();

-- Profile completion trigger
CREATE TRIGGER trigger_profile_completion
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_completion();

-- =========================
-- EMBEDDING SYSTEM TRIGGERS
-- =========================

-- Trigger function for auth user embedding (handles UUID conversion)
CREATE OR REPLACE FUNCTION trigger_auth_user_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  content_id_bigint bigint;
BEGIN
  -- Convert UUID to bigint for compatibility
  content_id_bigint := ('x' || lpad(substring(NEW.id::text, 1, 16), 16, '0'))::bit(64)::bigint;
  
  -- Check if relevant fields have changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data OR
       NEW.user_metadata IS DISTINCT FROM OLD.user_metadata
     )) THEN
    
    -- Queue for embedding with high priority for auth users
    PERFORM queue_for_embedding_qstash('auth_user', content_id_bigint, 2);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Auth user embedding trigger
CREATE TRIGGER auth_user_embedding_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trigger_auth_user_embedding();

-- Trigger function for course embedding
CREATE OR REPLACE FUNCTION trigger_course_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if relevant fields have changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.requirements IS DISTINCT FROM OLD.requirements OR
       NEW.learning_objectives IS DISTINCT FROM OLD.learning_objectives OR
       NEW.category IS DISTINCT FROM OLD.category OR
       NEW.tags IS DISTINCT FROM OLD.tags
     )) THEN
    
    -- Queue for embedding
    PERFORM queue_for_embedding_qstash('course', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Course embedding trigger
CREATE TRIGGER course_embedding_trigger
  AFTER INSERT OR UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION trigger_course_embedding();

-- Trigger function for lesson embedding
CREATE OR REPLACE FUNCTION trigger_lesson_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if relevant fields have changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.transcript IS DISTINCT FROM OLD.transcript
     )) THEN
    
    -- Queue for embedding
    PERFORM queue_for_embedding_qstash('lesson', NEW.id, 4);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Lesson embedding trigger
CREATE TRIGGER lesson_embedding_trigger
  AFTER INSERT OR UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION trigger_lesson_embedding();

-- Trigger function for post embedding
CREATE OR REPLACE FUNCTION trigger_post_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if relevant fields have changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.body IS DISTINCT FROM OLD.body
     )) THEN
    
    -- Queue for embedding
    PERFORM queue_for_embedding_qstash('post', NEW.id, 5);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Post embedding trigger
CREATE TRIGGER post_embedding_trigger
  AFTER INSERT OR UPDATE ON community_post
  FOR EACH ROW EXECUTE FUNCTION trigger_post_embedding();

-- Trigger function for comment embedding
CREATE OR REPLACE FUNCTION trigger_comment_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if relevant fields have changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.body IS DISTINCT FROM OLD.body
     )) THEN
    
    -- Queue for embedding
    PERFORM queue_for_embedding_qstash('comment', NEW.id, 6);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Comment embedding trigger
CREATE TRIGGER comment_embedding_trigger
  AFTER INSERT OR UPDATE ON community_comment
  FOR EACH ROW EXECUTE FUNCTION trigger_comment_embedding();

-- =========================
-- SLUG GENERATION TRIGGERS
-- =========================

-- Trigger function for course slug generation
CREATE OR REPLACE FUNCTION generate_course_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM course WHERE slug = NEW.slug AND id != COALESCE(NEW.id, 0)) LOOP
      NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Course slug trigger
CREATE TRIGGER course_slug_trigger
  BEFORE INSERT OR UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION generate_course_slug();

-- Trigger function for lesson slug generation
CREATE OR REPLACE FUNCTION generate_lesson_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
    
    -- Ensure uniqueness within the course
    WHILE EXISTS (
      SELECT 1 FROM course_lesson 
      WHERE slug = NEW.slug 
      AND course_id = NEW.course_id 
      AND id != COALESCE(NEW.id, 0)
    ) LOOP
      NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Lesson slug trigger
CREATE TRIGGER lesson_slug_trigger
  BEFORE INSERT OR UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION generate_lesson_slug();

-- =========================
-- SEARCH VECTOR TRIGGERS
-- =========================

-- Trigger function for community post search vector
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$;

-- Post search vector trigger
CREATE TRIGGER post_search_vector_trigger
  BEFORE INSERT OR UPDATE ON community_post
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

-- Trigger function for hashtag search vector
CREATE OR REPLACE FUNCTION update_hashtag_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.name);
  RETURN NEW;
END;
$$;

-- Hashtag search vector trigger
CREATE TRIGGER hashtag_search_vector_trigger
  BEFORE INSERT OR UPDATE ON hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_search_vector();

-- =========================
-- UPDATED_AT TIMESTAMP TRIGGERS
-- =========================

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER course_updated_at_trigger
  BEFORE UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER course_lesson_updated_at_trigger
  BEFORE UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER course_enrollment_updated_at_trigger
  BEFORE UPDATE ON course_enrollment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER course_progress_updated_at_trigger
  BEFORE UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER classroom_updated_at_trigger
  BEFORE UPDATE ON classroom
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER classroom_member_updated_at_trigger
  BEFORE UPDATE ON classroom_member
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER classroom_live_session_updated_at_trigger
  BEFORE UPDATE ON classroom_live_session
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER community_group_updated_at_trigger
  BEFORE UPDATE ON community_group
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER community_post_updated_at_trigger
  BEFORE UPDATE ON community_post
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER community_comment_updated_at_trigger
  BEFORE UPDATE ON community_comment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER embeddings_updated_at_trigger
  BEFORE UPDATE ON embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER embedding_queue_updated_at_trigger
  BEFORE UPDATE ON embedding_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER video_embeddings_updated_at_trigger
  BEFORE UPDATE ON video_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- VIDEO PROCESSING TRIGGERS
-- =========================

-- Function to update updated_at timestamp for video processing
CREATE OR REPLACE FUNCTION update_video_processing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Video processing queue updated_at trigger
CREATE TRIGGER video_processing_queue_updated_at
    BEFORE UPDATE ON video_processing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_video_processing_updated_at();

-- Video processing steps updated_at trigger
CREATE TRIGGER video_processing_steps_updated_at
    BEFORE UPDATE ON video_processing_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_video_processing_updated_at();

-- =========================
-- QUIZ SYSTEM TRIGGERS
-- =========================

-- Function to update updated_at timestamp for quiz sessions
CREATE OR REPLACE FUNCTION update_quiz_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Quiz session updated_at trigger
CREATE TRIGGER trigger_update_quiz_session_updated_at
  BEFORE UPDATE ON community_quiz_attempt_session
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_session_updated_at();

-- =========================
-- QUIZ SUBJECT AND GRADE TRIGGERS
-- =========================

-- Create trigger to automatically update search vectors
CREATE TRIGGER trigger_update_quiz_search_vectors
  BEFORE INSERT OR UPDATE ON community_quiz
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_search_vectors();

-- Create triggers for subject and grade updates
CREATE TRIGGER trigger_update_quiz_search_on_subject_change
  AFTER UPDATE ON community_quiz_subject
  FOR EACH ROW
  WHEN (OLD.translations IS DISTINCT FROM NEW.translations)
  EXECUTE FUNCTION update_quiz_search_vectors_on_subject_change();

CREATE TRIGGER trigger_update_quiz_search_on_grade_change
  AFTER UPDATE ON community_quiz_grade
  FOR EACH ROW
  WHEN (OLD.translations IS DISTINCT FROM NEW.translations)
  EXECUTE FUNCTION update_quiz_search_vectors_on_grade_change();

-- Add updated_at trigger for subject table
CREATE TRIGGER trigger_community_quiz_subject_updated_at
  BEFORE UPDATE ON community_quiz_subject
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for grade table
CREATE TRIGGER trigger_community_quiz_grade_updated_at
  BEFORE UPDATE ON community_quiz_grade
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for new triggers
COMMENT ON TRIGGER trigger_update_quiz_search_vectors ON community_quiz IS 
'Automatically updates multilingual search vectors when quiz content or related subject/grade changes.';

COMMENT ON TRIGGER trigger_update_quiz_search_on_subject_change ON community_quiz_subject IS 
'Updates search vectors for all quizzes when subject translations change.';

COMMENT ON TRIGGER trigger_update_quiz_search_on_grade_change ON community_quiz_grade IS 
'Updates search vectors for all quizzes when grade translations change.';

COMMENT ON TRIGGER trigger_community_quiz_subject_updated_at ON community_quiz_subject IS 
'Automatically updates the updated_at timestamp when subject data changes.';

COMMENT ON TRIGGER trigger_community_quiz_grade_updated_at ON community_quiz_grade IS 
'Automatically updates the updated_at timestamp when grade data changes.';

-- =========================
-- NOTIFICATION TRIGGERS
-- =========================

CREATE TRIGGER notification_categories_updated_at_trigger
  BEFORE UPDATE ON notification_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notification_templates_updated_at_trigger
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_notification_preferences_updated_at_trigger
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notification_delivery_log_updated_at_trigger
  BEFORE UPDATE ON notification_delivery_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- COMMENTS FOR TRIGGERS
-- =========================

COMMENT ON TRIGGER profile_embedding_trigger ON profiles IS 
'Automatically queues profile data for embedding when profile is created or updated. Monitors changes to display_name, full_name, bio, role, and preferences fields.';

COMMENT ON TRIGGER auth_user_embedding_trigger ON auth.users IS 
'Automatically queues auth user data for embedding when user data is updated. Handles UUID to bigint conversion for compatibility.';

COMMENT ON TRIGGER course_embedding_trigger ON course IS 
'Automatically queues course data for embedding when course content changes.';

COMMENT ON TRIGGER post_search_vector_trigger ON community_post IS 
'Updates full-text search vector for community posts when title or body changes.';

COMMENT ON TRIGGER course_slug_trigger ON course IS 
'Automatically generates unique slugs for courses based on title.';

COMMENT ON TRIGGER lesson_slug_trigger ON course_lesson IS 
'Automatically generates unique slugs for lessons within courses based on title.';
