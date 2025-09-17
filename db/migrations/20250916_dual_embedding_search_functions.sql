-- Migration: Add dual embedding search functions
-- Date: 2025-09-16
-- Purpose: Create optimized search functions for both E5 and BGE embeddings

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Function for E5-Small embedding search (384 dimensions)
CREATE OR REPLACE FUNCTION search_video_embeddings_e5(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  attachment_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  word_count int,
  sentence_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    1 - (ve.embedding_e5_small <=> query_embedding) as similarity,
    ve.chunk_type,
    ve.word_count,
    ve.sentence_count,
    ve.created_at
  FROM video_embeddings ve
  WHERE 
    ve.has_e5_embedding = true
    AND ve.status = 'completed'
    AND ve.is_deleted = false
    AND 1 - (ve.embedding_e5_small <=> query_embedding) > match_threshold
  ORDER BY ve.embedding_e5_small <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for BGE-M3 embedding search (1024 dimensions)
CREATE OR REPLACE FUNCTION search_video_embeddings_bge(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  attachment_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  word_count int,
  sentence_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    1 - (ve.embedding_bge_m3 <=> query_embedding) as similarity,
    ve.chunk_type,
    ve.word_count,
    ve.sentence_count,
    ve.created_at
  FROM video_embeddings ve
  WHERE 
    ve.has_bge_embedding = true
    AND ve.status = 'completed'
    AND ve.is_deleted = false
    AND 1 - (ve.embedding_bge_m3 <=> query_embedding) > match_threshold
  ORDER BY ve.embedding_bge_m3 <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search function that combines both embeddings
CREATE OR REPLACE FUNCTION search_video_embeddings_hybrid(
  query_embedding_e5 vector(384) DEFAULT NULL,
  query_embedding_bge vector(1024) DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  weight_e5 float DEFAULT 0.4,
  weight_bge float DEFAULT 0.6
)
RETURNS TABLE (
  id bigint,
  attachment_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_types text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    CASE 
      WHEN query_embedding_e5 IS NOT NULL AND query_embedding_bge IS NOT NULL 
           AND ve.has_e5_embedding AND ve.has_bge_embedding THEN
        -- Both embeddings available - weighted average
        (weight_e5 * (1 - (ve.embedding_e5_small <=> query_embedding_e5))) +
        (weight_bge * (1 - (ve.embedding_bge_m3 <=> query_embedding_bge)))
      WHEN query_embedding_e5 IS NOT NULL AND ve.has_e5_embedding THEN
        -- Only E5 available
        1 - (ve.embedding_e5_small <=> query_embedding_e5)
      WHEN query_embedding_bge IS NOT NULL AND ve.has_bge_embedding THEN
        -- Only BGE available
        1 - (ve.embedding_bge_m3 <=> query_embedding_bge)
      ELSE 0
    END as similarity,
    ve.chunk_type,
    ve.word_count,
    ve.sentence_count,
    ve.created_at,
    CASE 
      WHEN ve.has_e5_embedding AND ve.has_bge_embedding THEN 'dual'
      WHEN ve.has_e5_embedding THEN 'e5_only'
      WHEN ve.has_bge_embedding THEN 'bge_only'
      ELSE 'none'
    END as embedding_types
  FROM video_embeddings ve
  WHERE 
    ve.status = 'completed'
    AND ve.is_deleted = false
    AND (
      (query_embedding_e5 IS NOT NULL AND ve.has_e5_embedding AND 
       1 - (ve.embedding_e5_small <=> query_embedding_e5) > match_threshold)
      OR
      (query_embedding_bge IS NOT NULL AND ve.has_bge_embedding AND 
       1 - (ve.embedding_bge_m3 <=> query_embedding_bge) > match_threshold)
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_statistics()
RETURNS TABLE (
  total_embeddings bigint,
  dual_embeddings bigint,
  e5_only bigint,
  bge_only bigint,
  incomplete bigint,
  dual_coverage_percent numeric,
  avg_text_length numeric,
  avg_word_count numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_embeddings,
    COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_embeddings,
    COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
    COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
    COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as incomplete,
    ROUND(
      (COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding)::numeric / 
       NULLIF(COUNT(*), 0)::numeric) * 100, 2
    ) as dual_coverage_percent,
    ROUND(AVG(LENGTH(content_text)), 2) as avg_text_length,
    ROUND(AVG(word_count), 2) as avg_word_count
  FROM video_embeddings
  WHERE status = 'completed' AND is_deleted = false;
END;
$$;

-- Function to find embeddings that need backfilling
CREATE OR REPLACE FUNCTION find_incomplete_embeddings(
  limit_count int DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  attachment_id bigint,
  content_text text,
  has_e5_embedding boolean,
  has_bge_embedding boolean,
  missing_types text[],
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ve.id,
    ve.attachment_id,
    ve.content_text,
    ve.has_e5_embedding,
    ve.has_bge_embedding,
    CASE 
      WHEN NOT ve.has_e5_embedding AND NOT ve.has_bge_embedding THEN ARRAY['e5', 'bge']
      WHEN NOT ve.has_e5_embedding THEN ARRAY['e5']
      WHEN NOT ve.has_bge_embedding THEN ARRAY['bge']
      ELSE ARRAY[]::text[]
    END as missing_types,
    ve.created_at
  FROM video_embeddings ve
  WHERE 
    ve.status = 'completed'
    AND ve.is_deleted = false
    AND (NOT ve.has_e5_embedding OR NOT ve.has_bge_embedding)
  ORDER BY ve.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION search_video_embeddings_e5 IS 'Search using E5-Small embeddings (384d) with cosine similarity';
COMMENT ON FUNCTION search_video_embeddings_bge IS 'Search using BGE-M3 embeddings (1024d) with cosine similarity';
COMMENT ON FUNCTION search_video_embeddings_hybrid IS 'Hybrid search combining both E5 and BGE embeddings with configurable weights';
COMMENT ON FUNCTION get_embedding_statistics IS 'Get comprehensive statistics about embedding completeness and coverage';
COMMENT ON FUNCTION find_incomplete_embeddings IS 'Find embeddings that are missing E5 or BGE vectors for backfilling';
