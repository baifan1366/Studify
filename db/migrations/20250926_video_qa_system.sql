-- ========================================
-- Video QA System Migration
-- Date: 2025-09-26
-- Purpose: Add AI-powered video Q&A functionality with terms extraction
-- ========================================

-- 1. Video Q&A History Table
CREATE TABLE IF NOT EXISTS video_qa_history (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  video_time numeric NOT NULL, -- Video timestamp when question was asked
  context_segments jsonb, -- Relevant video segments used for context
  is_helpful boolean, -- User feedback on answer quality
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

-- 2. Video Segments Table (for storing transcription segments with timestamps)
CREATE TABLE IF NOT EXISTS video_segments (
  id bigserial PRIMARY KEY,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  start_time numeric NOT NULL, -- Start time in seconds
  end_time numeric NOT NULL,   -- End time in seconds
  text text NOT NULL,          -- Transcribed text for this segment
  confidence numeric,          -- Transcription confidence score (0-1)
  speaker_id text,             -- Optional speaker identification
  metadata jsonb,              -- Additional metadata (language, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Video Terms Cache Table (for caching AI-extracted terms)
CREATE TABLE IF NOT EXISTS video_terms_cache (
  id bigserial PRIMARY KEY,
  lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
  time_window_start numeric NOT NULL, -- Start of time window
  time_window_end numeric NOT NULL,   -- End of time window
  terms jsonb NOT NULL,               -- Array of extracted terms with definitions
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_qa_history_user_lesson 
  ON video_qa_history(user_id, lesson_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_video_qa_history_created_at 
  ON video_qa_history(created_at DESC) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_video_segments_lesson_time 
  ON video_segments(lesson_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_video_segments_time_range 
  ON video_segments USING GIST (numrange(start_time, end_time));

CREATE INDEX IF NOT EXISTS idx_video_terms_cache_lesson_time 
  ON video_terms_cache(lesson_id, time_window_start, time_window_end);

CREATE INDEX IF NOT EXISTS idx_video_terms_cache_expires 
  ON video_terms_cache(expires_at);

-- 6. Create functions for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_video_terms()
RETURNS void AS $$
BEGIN
  DELETE FROM video_terms_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_video_qa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_qa_history_updated_at
  BEFORE UPDATE ON video_qa_history
  FOR EACH ROW EXECUTE FUNCTION trigger_video_qa_updated_at();

CREATE TRIGGER video_segments_updated_at
  BEFORE UPDATE ON video_segments
  FOR EACH ROW EXECUTE FUNCTION trigger_video_qa_updated_at();

-- 8. Add comments for documentation
COMMENT ON TABLE video_qa_history IS 'Stores user Q&A interactions with video content';
COMMENT ON TABLE video_segments IS 'Stores video transcription segments with timestamps';
COMMENT ON TABLE video_terms_cache IS 'Caches AI-extracted terms for video segments';

COMMENT ON COLUMN video_qa_history.video_time IS 'Video timestamp (seconds) when question was asked';
COMMENT ON COLUMN video_qa_history.context_segments IS 'JSON array of video segments used for context';
COMMENT ON COLUMN video_qa_history.is_helpful IS 'User feedback on answer quality (nullable)';

COMMENT ON COLUMN video_segments.start_time IS 'Segment start time in seconds';
COMMENT ON COLUMN video_segments.end_time IS 'Segment end time in seconds';
COMMENT ON COLUMN video_segments.confidence IS 'Transcription confidence score (0.0-1.0)';

COMMENT ON COLUMN video_terms_cache.time_window_start IS 'Start of time window for cached terms';
COMMENT ON COLUMN video_terms_cache.time_window_end IS 'End of time window for cached terms';
COMMENT ON COLUMN video_terms_cache.terms IS 'JSON array of extracted terms with definitions';
COMMENT ON COLUMN video_terms_cache.expires_at IS 'Cache expiration timestamp';

-- 9. Create a view for active video Q&A with lesson info
CREATE OR REPLACE VIEW video_qa_with_lesson AS
SELECT 
  vq.id,
  vq.public_id,
  vq.user_id,
  vq.question,
  vq.answer,
  vq.video_time,
  vq.context_segments,
  vq.is_helpful,
  vq.created_at,
  vq.updated_at,
  -- Lesson information
  cl.public_id as lesson_public_id,
  cl.title as lesson_title,
  cl.kind as lesson_kind,
  -- Module information
  cm.title as module_title,
  -- Course information
  c.title as course_title,
  c.slug as course_slug
FROM video_qa_history vq
JOIN course_lesson cl ON vq.lesson_id = cl.id
JOIN course_module cm ON cl.module_id = cm.id
JOIN course c ON cm.course_id = c.id
WHERE vq.is_deleted = false
  AND cl.is_deleted = false
  AND cm.is_deleted = false
  AND c.is_deleted = false;

COMMENT ON VIEW video_qa_with_lesson IS 'Video Q&A history with related lesson and course information';

-- 10. Sample function to search Q&A history
CREATE OR REPLACE FUNCTION search_video_qa_history(
  p_user_id bigint,
  p_search_text text DEFAULT NULL,
  p_lesson_id bigint DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  public_id uuid,
  question text,
  answer text,
  video_time numeric,
  is_helpful boolean,
  created_at timestamptz,
  lesson_title text,
  lesson_public_id uuid,
  course_title text,
  course_slug text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vql.id,
    vql.public_id,
    vql.question,
    vql.answer,
    vql.video_time,
    vql.is_helpful,
    vql.created_at,
    vql.lesson_title,
    vql.lesson_public_id,
    vql.course_title,
    vql.course_slug
  FROM video_qa_with_lesson vql
  WHERE vql.user_id = p_user_id
    AND (p_search_text IS NULL OR (
      vql.question ILIKE '%' || p_search_text || '%' OR
      vql.answer ILIKE '%' || p_search_text || '%'
    ))
    AND (p_lesson_id IS NULL OR EXISTS (
      SELECT 1 FROM course_lesson cl 
      WHERE cl.public_id::text = p_lesson_id::text 
      AND cl.id = (
        SELECT lesson_id FROM video_qa_history 
        WHERE id = vql.id
      )
    ))
  ORDER BY vql.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_video_qa_history IS 'Search user video Q&A history with optional filters';
