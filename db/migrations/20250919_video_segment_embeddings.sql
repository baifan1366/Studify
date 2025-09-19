-- Migration: Add video segment support to video_embeddings table
-- Date: 2025-09-19
-- Purpose: Support segmented video embeddings for improved RAG functionality

-- Add segment-specific fields to video_embeddings table
ALTER TABLE video_embeddings 
ADD COLUMN IF NOT EXISTS segment_start_time float DEFAULT NULL,
ADD COLUMN IF NOT EXISTS segment_end_time float DEFAULT NULL,
ADD COLUMN IF NOT EXISTS segment_index int DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_segments int DEFAULT NULL,
ADD COLUMN IF NOT EXISTS segment_duration float GENERATED ALWAYS AS (
  CASE 
    WHEN segment_start_time IS NOT NULL AND segment_end_time IS NOT NULL 
    THEN segment_end_time - segment_start_time 
    ELSE NULL 
  END
) STORED;

-- Add context and relationship fields
ALTER TABLE video_embeddings 
ADD COLUMN IF NOT EXISTS prev_segment_id bigint REFERENCES video_embeddings(id),
ADD COLUMN IF NOT EXISTS next_segment_id bigint REFERENCES video_embeddings(id),
ADD COLUMN IF NOT EXISTS segment_overlap_start float DEFAULT NULL,
ADD COLUMN IF NOT EXISTS segment_overlap_end float DEFAULT NULL;

-- Add segment quality and content metadata
ALTER TABLE video_embeddings 
ADD COLUMN IF NOT EXISTS contains_code boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contains_math boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contains_diagram boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS topic_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS confidence_score float DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Update chunk_type constraint to include 'segment'
ALTER TABLE video_embeddings 
DROP CONSTRAINT IF EXISTS video_embeddings_chunk_type_check;

ALTER TABLE video_embeddings 
ADD CONSTRAINT video_embeddings_chunk_type_check 
CHECK (chunk_type IN ('summary', 'section', 'paragraph', 'detail', 'segment'));

-- Add indexes for efficient segment queries
CREATE INDEX IF NOT EXISTS idx_video_embeddings_attachment_segments 
ON video_embeddings (attachment_id, segment_index) 
WHERE segment_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_embeddings_time_range 
ON video_embeddings (attachment_id, segment_start_time, segment_end_time) 
WHERE segment_start_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_embeddings_chunk_type_segment 
ON video_embeddings (chunk_type, attachment_id) 
WHERE chunk_type = 'segment';

-- Add indexes for topic and content type filtering
CREATE INDEX IF NOT EXISTS idx_video_embeddings_topic_keywords 
ON video_embeddings USING GIN (topic_keywords);

CREATE INDEX IF NOT EXISTS idx_video_embeddings_content_flags 
ON video_embeddings (contains_code, contains_math, contains_diagram) 
WHERE contains_code = true OR contains_math = true OR contains_diagram = true;

-- Create composite index for RAG queries
CREATE INDEX IF NOT EXISTS idx_video_embeddings_rag_query 
ON video_embeddings (attachment_id, chunk_type, has_e5_embedding, has_bge_embedding, status) 
WHERE status = 'completed' AND is_deleted = false;

-- Add comments for documentation
COMMENT ON COLUMN video_embeddings.segment_start_time IS 'Start time of video segment in seconds';
COMMENT ON COLUMN video_embeddings.segment_end_time IS 'End time of video segment in seconds';
COMMENT ON COLUMN video_embeddings.segment_index IS 'Index of segment within video (0-based)';
COMMENT ON COLUMN video_embeddings.total_segments IS 'Total number of segments in the video';
COMMENT ON COLUMN video_embeddings.segment_duration IS 'Computed duration of segment in seconds';
COMMENT ON COLUMN video_embeddings.prev_segment_id IS 'ID of previous segment for context';
COMMENT ON COLUMN video_embeddings.next_segment_id IS 'ID of next segment for context';
COMMENT ON COLUMN video_embeddings.segment_overlap_start IS 'Overlap start time with previous segment';
COMMENT ON COLUMN video_embeddings.segment_overlap_end IS 'Overlap end time with next segment';
COMMENT ON COLUMN video_embeddings.contains_code IS 'Whether segment contains code snippets';
COMMENT ON COLUMN video_embeddings.contains_math IS 'Whether segment contains mathematical formulas';
COMMENT ON COLUMN video_embeddings.contains_diagram IS 'Whether segment references diagrams/visuals';
COMMENT ON COLUMN video_embeddings.topic_keywords IS 'Array of key topics/concepts in segment';
COMMENT ON COLUMN video_embeddings.confidence_score IS 'Confidence score for segment quality (0-1)';

-- Create function to get segment context (previous and next segments)
CREATE OR REPLACE FUNCTION get_segment_context(
  target_segment_id bigint,
  context_window int DEFAULT 1
) RETURNS TABLE (
  segment_id bigint,
  segment_index int,
  start_time float,
  end_time float,
  content_text text,
  segment_position text -- 'before', 'current', 'after'
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT ve.attachment_id, ve.segment_index as target_index
    FROM video_embeddings ve
    WHERE ve.id = target_segment_id
  )
  SELECT 
    ve.id,
    ve.segment_index,
    ve.segment_start_time,
    ve.segment_end_time,
    ve.content_text,
    CASE 
      WHEN ve.segment_index < t.target_index THEN 'before'
      WHEN ve.segment_index = t.target_index THEN 'current'
      ELSE 'after'
    END as segment_position
  FROM video_embeddings ve
  JOIN target t ON ve.attachment_id = t.attachment_id
  WHERE 
    ve.chunk_type = 'segment'
    AND ve.segment_index BETWEEN (t.target_index - context_window) AND (t.target_index + context_window)
    AND ve.status = 'completed'
    AND ve.is_deleted = false
  ORDER BY ve.segment_index;
END;
$$;

-- Create function to search segments with time-based filtering
CREATE OR REPLACE FUNCTION search_video_segments_with_time(
  query_embedding_e5 vector(384) DEFAULT NULL,
  query_embedding_bge vector(1024) DEFAULT NULL,
  attachment_ids bigint[] DEFAULT NULL,
  start_time_min float DEFAULT NULL,
  start_time_max float DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  include_context boolean DEFAULT false
) RETURNS TABLE (
  segment_id bigint,
  attachment_id bigint,
  segment_index int,
  start_time float,
  end_time float,
  duration float,
  content_text text,
  topic_keywords text[],
  similarity_e5 float,
  similarity_bge float,
  combined_similarity float,
  context_before text,
  context_after text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH segment_matches AS (
    SELECT 
      ve.id,
      ve.attachment_id,
      ve.segment_index,
      ve.segment_start_time,
      ve.segment_end_time,
      ve.segment_duration,
      ve.content_text,
      ve.topic_keywords,
      CASE 
        WHEN query_embedding_e5 IS NOT NULL AND ve.has_e5_embedding 
        THEN 1 - (ve.embedding_e5_small <=> query_embedding_e5)
        ELSE 0 
      END as sim_e5,
      CASE 
        WHEN query_embedding_bge IS NOT NULL AND ve.has_bge_embedding 
        THEN 1 - (ve.embedding_bge_m3 <=> query_embedding_bge)
        ELSE 0 
      END as sim_bge
    FROM video_embeddings ve
    WHERE 
      ve.chunk_type = 'segment'
      AND ve.status = 'completed'
      AND ve.is_deleted = false
      AND (attachment_ids IS NULL OR ve.attachment_id = ANY(attachment_ids))
      AND (start_time_min IS NULL OR ve.segment_start_time >= start_time_min)
      AND (start_time_max IS NULL OR ve.segment_start_time <= start_time_max)
  ),
  ranked_segments AS (
    SELECT 
      *,
      -- Weighted combination of similarities (favor BGE-M3 if available)
      CASE 
        WHEN sim_bge > 0 AND sim_e5 > 0 THEN (sim_bge * 0.7 + sim_e5 * 0.3)
        WHEN sim_bge > 0 THEN sim_bge
        WHEN sim_e5 > 0 THEN sim_e5
        ELSE 0
      END as combined_sim
    FROM segment_matches
  )
  SELECT 
    rs.id,
    rs.attachment_id,
    rs.segment_index,
    rs.segment_start_time,
    rs.segment_end_time,
    rs.segment_duration,
    rs.content_text,
    rs.topic_keywords,
    rs.sim_e5,
    rs.sim_bge,
    rs.combined_sim,
    CASE 
      WHEN include_context THEN (
        SELECT ve_prev.content_text 
        FROM video_embeddings ve_prev 
        WHERE ve_prev.attachment_id = rs.attachment_id 
          AND ve_prev.segment_index = rs.segment_index - 1 
          AND ve_prev.chunk_type = 'segment'
        LIMIT 1
      )
      ELSE NULL 
    END,
    CASE 
      WHEN include_context THEN (
        SELECT ve_next.content_text 
        FROM video_embeddings ve_next 
        WHERE ve_next.attachment_id = rs.attachment_id 
          AND ve_next.segment_index = rs.segment_index + 1 
          AND ve_next.chunk_type = 'segment'
        LIMIT 1
      )
      ELSE NULL 
    END
  FROM ranked_segments rs
  WHERE rs.combined_sim >= match_threshold
  ORDER BY rs.combined_sim DESC
  LIMIT match_count;
END;
$$;

-- Add comments for functions
COMMENT ON FUNCTION get_segment_context IS 'Get context segments (before/current/after) for a given segment with segment_position field';
COMMENT ON FUNCTION search_video_segments_with_time IS 'Search video segments with time-based filtering and context';
