-- Embedding System Migration
-- Creates tables and functions for storing and managing vector embeddings

-- Enable vector extension for embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- Embedding Tables
-- =========================

-- Main embedding table for storing vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Content identification
  content_type text NOT NULL CHECK (content_type IN ('profile', 'post', 'comment', 'course', 'lesson', 'auth_user')),
  content_id bigint NOT NULL, -- References the actual content table ID
  content_hash text NOT NULL, -- Hash of content to detect changes
  
  -- Embedding data
  embedding vector(384), -- 384-dimensional embedding vector
  content_text text NOT NULL, -- The actual text that was embedded
  
  -- Metadata
  embedding_model text DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
  language text DEFAULT 'en',
  token_count int,
  
  -- Status and lifecycle
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'outdated')) DEFAULT 'pending',
  error_message text,
  retry_count int DEFAULT 0,
  
  -- Timestamps
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  
  -- Ensure uniqueness per content
  UNIQUE(content_type, content_id)
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index for content lookup
CREATE INDEX IF NOT EXISTS idx_embeddings_content ON embeddings (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_status ON embeddings (status);
CREATE INDEX IF NOT EXISTS idx_embeddings_hash ON embeddings (content_hash);

-- Embedding queue for batch processing
CREATE TABLE IF NOT EXISTS embedding_queue (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Content identification
  content_type text NOT NULL CHECK (content_type IN ('profile', 'post', 'comment', 'course', 'lesson', 'auth_user')),
  content_id bigint NOT NULL,
  content_text text NOT NULL,
  content_hash text NOT NULL,
  
  -- Processing metadata
  priority int DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
  scheduled_at timestamptz DEFAULT now(),
  processing_started_at timestamptz,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  
  -- Status
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
  error_message text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure no duplicates in queue
  UNIQUE(content_type, content_id)
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status_priority ON embedding_queue (status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_content ON embedding_queue (content_type, content_id);

-- Embedding search history for analytics
CREATE TABLE IF NOT EXISTS embedding_searches (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Search details
  user_id bigint REFERENCES profiles(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  query_embedding vector(384),
  
  -- Search parameters
  content_types text[] DEFAULT '{}', -- Filter by content types
  similarity_threshold numeric(3,2) DEFAULT 0.7,
  max_results int DEFAULT 10,
  
  -- Results
  results_count int DEFAULT 0,
  results_data jsonb DEFAULT '[]'::jsonb, -- Store top results for analytics
  
  -- Performance metrics
  processing_time_ms int,
  embedding_time_ms int,
  search_time_ms int,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for search analytics
CREATE INDEX IF NOT EXISTS idx_embedding_searches_user ON embedding_searches (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_searches_query ON embedding_searches USING gin(to_tsvector('english', query_text));

-- =========================
-- Helper Functions
-- =========================

-- Function to extract searchable text from different content types
CREATE OR REPLACE FUNCTION extract_content_text(content_type text, content_id bigint)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text := '';
  profile_record profiles%ROWTYPE;
  course_record course%ROWTYPE;
  post_record community_post%ROWTYPE;
  comment_record community_comment%ROWTYPE;
  lesson_record course_lesson%ROWTYPE;
  auth_record auth.users%ROWTYPE;
BEGIN
  CASE content_type
    WHEN 'profile' THEN
      SELECT * INTO profile_record FROM profiles WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(profile_record.display_name, '') || ' ' || 
                      COALESCE(profile_record.full_name, '') || ' ' || 
                      COALESCE(profile_record.bio, '') || ' ' || 
                      COALESCE(profile_record.role, '');
      END IF;
      
    WHEN 'course' THEN
      SELECT * INTO course_record FROM course WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(course_record.title, '') || ' ' || 
                      COALESCE(course_record.description, '') || ' ' || 
                      COALESCE(course_record.category, '') || ' ' ||
                      COALESCE(array_to_string(course_record.tags, ' '), '') || ' ' ||
                      COALESCE(array_to_string(course_record.requirements, ' '), '') || ' ' ||
                      COALESCE(array_to_string(course_record.learning_objectives, ' '), '');
      END IF;
      
    WHEN 'post' THEN
      SELECT * INTO post_record FROM community_post WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(post_record.title, '') || ' ' || 
                      COALESCE(post_record.content, '') || ' ' ||
                      COALESCE(array_to_string(post_record.tags, ' '), '');
      END IF;
      
    WHEN 'comment' THEN
      SELECT * INTO comment_record FROM community_comment WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(comment_record.content, '');
      END IF;
      
    WHEN 'lesson' THEN
      SELECT * INTO lesson_record FROM course_lesson WHERE id = content_id AND is_deleted = false;
      IF FOUND THEN
        result_text := COALESCE(lesson_record.title, '') || ' ' || 
                      COALESCE(lesson_record.description, '') || ' ' ||
                      COALESCE(lesson_record.transcript, '');
      END IF;
      
    WHEN 'auth_user' THEN
      SELECT * INTO auth_record FROM auth.users WHERE id::text = content_id::text;
      IF FOUND THEN
        result_text := COALESCE(auth_record.email, '') || ' ' || 
                      COALESCE(auth_record.raw_user_meta_data->>'full_name', '') || ' ' ||
                      COALESCE(auth_record.raw_user_meta_data->>'display_name', '');
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Unknown content_type: %', content_type;
  END CASE;
  
  -- Clean up the text
  result_text := TRIM(regexp_replace(result_text, '\s+', ' ', 'g'));
  
  -- Return empty string if no content found
  IF result_text IS NULL OR result_text = '' THEN
    result_text := '';
  END IF;
  
  RETURN result_text;
END;
$$;

-- Function to generate content hash
CREATE OR REPLACE FUNCTION generate_content_hash(content_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(digest(content_text, 'sha256'), 'hex');
END;
$$;

-- Function to queue content for embedding
CREATE OR REPLACE FUNCTION queue_for_embedding(
  p_content_type text,
  p_content_id bigint,
  p_priority int DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  content_text text;
  content_hash text;
  existing_hash text;
BEGIN
  -- Extract content text
  content_text := extract_content_text(p_content_type, p_content_id);
  
  -- Skip if no content
  IF content_text = '' THEN
    RETURN false;
  END IF;
  
  -- Generate hash
  content_hash := generate_content_hash(content_text);
  
  -- Check if embedding already exists and is up to date
  SELECT e.content_hash INTO existing_hash
  FROM embeddings e
  WHERE e.content_type = p_content_type 
    AND e.content_id = p_content_id 
    AND e.status = 'completed'
    AND e.is_deleted = false;
  
  -- Skip if hash matches (content hasn't changed)
  IF existing_hash = content_hash THEN
    RETURN false;
  END IF;
  
  -- Mark old embedding as outdated if exists
  UPDATE embeddings 
  SET status = 'outdated', updated_at = now()
  WHERE content_type = p_content_type 
    AND content_id = p_content_id 
    AND status = 'completed';
  
  -- Insert into queue (ON CONFLICT UPDATE to handle duplicates)
  INSERT INTO embedding_queue (
    content_type, content_id, content_text, content_hash, priority
  ) VALUES (
    p_content_type, p_content_id, content_text, content_hash, p_priority
  )
  ON CONFLICT (content_type, content_id) 
  DO UPDATE SET
    content_text = EXCLUDED.content_text,
    content_hash = EXCLUDED.content_hash,
    priority = EXCLUDED.priority,
    status = 'queued',
    retry_count = 0,
    error_message = NULL,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Function to get next batch for processing
CREATE OR REPLACE FUNCTION get_embedding_batch(batch_size int DEFAULT 10)
RETURNS TABLE(
  id bigint,
  content_type text,
  content_id bigint,
  content_text text,
  content_hash text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark items as processing and return them
  RETURN QUERY
  UPDATE embedding_queue eq
  SET 
    status = 'processing',
    processing_started_at = now(),
    updated_at = now()
  FROM (
    SELECT eq2.id
    FROM embedding_queue eq2
    WHERE eq2.status = 'queued'
      AND eq2.scheduled_at <= now()
      AND eq2.retry_count < eq2.max_retries
    ORDER BY eq2.priority ASC, eq2.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  ) batch
  WHERE eq.id = batch.id
  RETURNING eq.id, eq.content_type, eq.content_id, eq.content_text, eq.content_hash;
END;
$$;

-- Function to complete embedding processing
CREATE OR REPLACE FUNCTION complete_embedding(
  p_queue_id bigint,
  p_embedding vector(384),
  p_token_count int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  queue_record embedding_queue%ROWTYPE;
BEGIN
  -- Get queue record
  SELECT * INTO queue_record FROM embedding_queue WHERE id = p_queue_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Insert or update embedding
  INSERT INTO embeddings (
    content_type, content_id, content_hash, embedding, content_text,
    token_count, status, created_at, updated_at
  ) VALUES (
    queue_record.content_type, queue_record.content_id, queue_record.content_hash,
    p_embedding, queue_record.content_text, p_token_count, 'completed', now(), now()
  )
  ON CONFLICT (content_type, content_id)
  DO UPDATE SET
    content_hash = EXCLUDED.content_hash,
    embedding = EXCLUDED.embedding,
    content_text = EXCLUDED.content_text,
    token_count = EXCLUDED.token_count,
    status = 'completed',
    error_message = NULL,
    updated_at = now(),
    is_deleted = false;
  
  -- Remove from queue
  DELETE FROM embedding_queue WHERE id = p_queue_id;
  
  RETURN true;
END;
$$;

-- Function to handle embedding failures
CREATE OR REPLACE FUNCTION fail_embedding(
  p_queue_id bigint,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  queue_record embedding_queue%ROWTYPE;
BEGIN
  -- Get queue record
  SELECT * INTO queue_record FROM embedding_queue WHERE id = p_queue_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Increment retry count
  UPDATE embedding_queue
  SET 
    retry_count = retry_count + 1,
    error_message = p_error_message,
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'queued'
    END,
    scheduled_at = CASE 
      WHEN retry_count + 1 >= max_retries THEN scheduled_at
      ELSE now() + (retry_count + 1) * interval '5 minutes' -- Exponential backoff
    END,
    updated_at = now()
  WHERE id = p_queue_id;
  
  RETURN true;
END;
$$;

-- Function for semantic search
CREATE OR REPLACE FUNCTION semantic_search(
  p_query_embedding vector(384),
  p_content_types text[] DEFAULT NULL,
  p_similarity_threshold numeric(3,2) DEFAULT 0.7,
  p_max_results int DEFAULT 10,
  p_user_id bigint DEFAULT NULL
)
RETURNS TABLE(
  content_type text,
  content_id bigint,
  content_text text,
  similarity numeric,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_id bigint;
BEGIN
  -- Log search if user provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO embedding_searches (
      user_id, query_embedding, content_types, similarity_threshold, max_results
    ) VALUES (
      p_user_id, p_query_embedding, p_content_types, p_similarity_threshold, p_max_results
    ) RETURNING id INTO search_id;
  END IF;
  
  -- Perform similarity search
  RETURN QUERY
  SELECT 
    e.content_type,
    e.content_id,
    e.content_text,
    (1 - (e.embedding <=> p_query_embedding))::numeric AS similarity,
    jsonb_build_object(
      'created_at', e.created_at,
      'updated_at', e.updated_at,
      'token_count', e.token_count,
      'embedding_model', e.embedding_model
    ) AS metadata
  FROM embeddings e
  WHERE e.status = 'completed'
    AND e.is_deleted = false
    AND (p_content_types IS NULL OR e.content_type = ANY(p_content_types))
    AND (1 - (e.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_max_results;
  
  -- Update search results count
  IF p_user_id IS NOT NULL AND search_id IS NOT NULL THEN
    UPDATE embedding_searches 
    SET results_count = (
      SELECT COUNT(*) FROM embeddings e
      WHERE e.status = 'completed'
        AND e.is_deleted = false
        AND (p_content_types IS NULL OR e.content_type = ANY(p_content_types))
        AND (1 - (e.embedding <=> p_query_embedding)) >= p_similarity_threshold
    )
    WHERE id = search_id;
  END IF;
END;
$$;

-- =========================
-- Triggers for Auto-Embedding
-- =========================

-- Trigger function for profiles
CREATE OR REPLACE FUNCTION trigger_profile_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue for embedding on INSERT or UPDATE
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.display_name IS DISTINCT FROM NEW.display_name OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.role IS DISTINCT FROM NEW.role
  )) THEN
    PERFORM queue_for_embedding('profile', NEW.id, 3);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for courses
CREATE OR REPLACE FUNCTION trigger_course_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue for embedding on INSERT or UPDATE
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.category IS DISTINCT FROM NEW.category OR
    OLD.tags IS DISTINCT FROM NEW.tags OR
    OLD.requirements IS DISTINCT FROM NEW.requirements OR
    OLD.learning_objectives IS DISTINCT FROM NEW.learning_objectives
  )) THEN
    PERFORM queue_for_embedding('course', NEW.id, 2);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for community posts
CREATE OR REPLACE FUNCTION trigger_post_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue for embedding on INSERT or UPDATE
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.content IS DISTINCT FROM NEW.content OR
    OLD.tags IS DISTINCT FROM NEW.tags
  )) THEN
    PERFORM queue_for_embedding('post', NEW.id, 4);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for community comments
CREATE OR REPLACE FUNCTION trigger_comment_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue for embedding on INSERT or UPDATE
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.content IS DISTINCT FROM NEW.content
  )) THEN
    PERFORM queue_for_embedding('comment', NEW.id, 5);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for course lessons
CREATE OR REPLACE FUNCTION trigger_lesson_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Queue for embedding on INSERT or UPDATE
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.transcript IS DISTINCT FROM NEW.transcript
  )) THEN
    PERFORM queue_for_embedding('lesson', NEW.id, 3);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS profile_embedding_trigger ON profiles;
CREATE TRIGGER profile_embedding_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_profile_embedding();

DROP TRIGGER IF EXISTS course_embedding_trigger ON course;
CREATE TRIGGER course_embedding_trigger
  AFTER INSERT OR UPDATE ON course
  FOR EACH ROW EXECUTE FUNCTION trigger_course_embedding();

DROP TRIGGER IF EXISTS post_embedding_trigger ON community_post;
CREATE TRIGGER post_embedding_trigger
  AFTER INSERT OR UPDATE ON community_post
  FOR EACH ROW EXECUTE FUNCTION trigger_post_embedding();

DROP TRIGGER IF EXISTS comment_embedding_trigger ON community_comment;
CREATE TRIGGER comment_embedding_trigger
  AFTER INSERT OR UPDATE ON community_comment
  FOR EACH ROW EXECUTE FUNCTION trigger_comment_embedding();

DROP TRIGGER IF EXISTS lesson_embedding_trigger ON course_lesson;
CREATE TRIGGER lesson_embedding_trigger
  AFTER INSERT OR UPDATE ON course_lesson
  FOR EACH ROW EXECUTE FUNCTION trigger_lesson_embedding();

-- =========================
-- Initial Data Population
-- =========================

-- Queue existing data for embedding (run this after migration)
-- This will be handled by the application code to avoid long migration times

COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search across different content types';
COMMENT ON TABLE embedding_queue IS 'Queue for processing content that needs to be embedded';
COMMENT ON TABLE embedding_searches IS 'Analytics table for tracking embedding searches';
COMMENT ON FUNCTION extract_content_text(text, bigint) IS 'Extracts searchable text from different content types';
COMMENT ON FUNCTION queue_for_embedding(text, bigint, int) IS 'Queues content for embedding processing';
COMMENT ON FUNCTION semantic_search(vector(384), text[], numeric(3,2), int, bigint) IS 'Performs semantic similarity search across embeddings';
