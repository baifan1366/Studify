-- Migration: Add dual embedding search functions for main embeddings table
-- Date: 2025-09-18
-- Purpose: Create comprehensive search functions for E5 and BGE embeddings

-- Function for E5-Small embedding search (384 dimensions)
CREATE OR REPLACE FUNCTION search_embeddings_e5(
  query_embedding vector(384),
  content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id bigint DEFAULT NULL
)
RETURNS TABLE (
  content_type text,
  content_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  hierarchy_level int,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_model text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content_type,
    e.content_id,
    e.content_text,
    1 - (e.embedding_e5_small <=> query_embedding) as similarity,
    e.chunk_type,
    e.hierarchy_level,
    e.word_count,
    e.sentence_count,
    e.created_at,
    e.embedding_e5_model as embedding_model
  FROM embeddings e
  WHERE 
    e.has_e5_embedding = true
    AND e.status = 'completed'
    AND e.is_deleted = false
    AND (content_types IS NULL OR e.content_type = ANY(content_types))
    AND 1 - (e.embedding_e5_small <=> query_embedding) > match_threshold
  ORDER BY e.embedding_e5_small <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for BGE-M3 embedding search (1024 dimensions)
CREATE OR REPLACE FUNCTION search_embeddings_bge(
  query_embedding vector(1024),
  content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id bigint DEFAULT NULL
)
RETURNS TABLE (
  content_type text,
  content_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  hierarchy_level int,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_model text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content_type,
    e.content_id,
    e.content_text,
    1 - (e.embedding_bge_m3 <=> query_embedding) as similarity,
    e.chunk_type,
    e.hierarchy_level,
    e.word_count,
    e.sentence_count,
    e.created_at,
    e.embedding_bge_model as embedding_model
  FROM embeddings e
  WHERE 
    e.has_bge_embedding = true
    AND e.status = 'completed'
    AND e.is_deleted = false
    AND (content_types IS NULL OR e.content_type = ANY(content_types))
    AND 1 - (e.embedding_bge_m3 <=> query_embedding) > match_threshold
  ORDER BY e.embedding_bge_m3 <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Advanced hybrid search function that combines both embeddings
CREATE OR REPLACE FUNCTION search_embeddings_hybrid(
  query_embedding_e5 vector(384) DEFAULT NULL,
  query_embedding_bge vector(1024) DEFAULT NULL,
  content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  weight_e5 float DEFAULT 0.4,
  weight_bge float DEFAULT 0.6,
  user_id bigint DEFAULT NULL
)
RETURNS TABLE (
  content_type text,
  content_id bigint,
  content_text text,
  similarity float,
  chunk_type text,
  hierarchy_level int,
  word_count int,
  sentence_count int,
  created_at timestamptz,
  embedding_types text,
  individual_scores jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_id bigint;
BEGIN
  -- Log search if user_id provided
  IF user_id IS NOT NULL THEN
    INSERT INTO embedding_searches (
      user_id, query_text, query_embedding, query_embedding_bge, 
      content_types, similarity_threshold, max_results, search_type, embedding_weights
    ) VALUES (
      user_id, '', query_embedding_e5, query_embedding_bge,
      content_types, match_threshold, match_count, 'hybrid',
      jsonb_build_object('e5', weight_e5, 'bge', weight_bge)
    ) RETURNING id INTO search_id;
  END IF;

  RETURN QUERY
  WITH scored_results AS (
    SELECT
      e.content_type,
      e.content_id,
      e.content_text,
      e.chunk_type,
      e.hierarchy_level,
      e.word_count,
      e.sentence_count,
      e.created_at,
      -- Calculate individual similarities
      CASE WHEN e.has_e5_embedding AND query_embedding_e5 IS NOT NULL 
           THEN 1 - (e.embedding_e5_small <=> query_embedding_e5) 
           ELSE NULL END as e5_similarity,
      CASE WHEN e.has_bge_embedding AND query_embedding_bge IS NOT NULL 
           THEN 1 - (e.embedding_bge_m3 <=> query_embedding_bge) 
           ELSE NULL END as bge_similarity,
      -- Calculate combined similarity
      CASE 
        WHEN query_embedding_e5 IS NOT NULL AND query_embedding_bge IS NOT NULL 
             AND e.has_e5_embedding AND e.has_bge_embedding THEN
          -- Both embeddings available - weighted average
          (weight_e5 * (1 - (e.embedding_e5_small <=> query_embedding_e5))) +
          (weight_bge * (1 - (e.embedding_bge_m3 <=> query_embedding_bge)))
        WHEN query_embedding_e5 IS NOT NULL AND e.has_e5_embedding THEN
          -- Only E5 available
          1 - (e.embedding_e5_small <=> query_embedding_e5)
        WHEN query_embedding_bge IS NOT NULL AND e.has_bge_embedding THEN
          -- Only BGE available
          1 - (e.embedding_bge_m3 <=> query_embedding_bge)
        ELSE 0
      END as combined_similarity,
      -- Determine embedding types available
      CASE 
        WHEN e.has_e5_embedding AND e.has_bge_embedding THEN 'dual'
        WHEN e.has_e5_embedding THEN 'e5_only'
        WHEN e.has_bge_embedding THEN 'bge_only'
        ELSE 'none'
      END as embedding_types
    FROM embeddings e
    WHERE 
      e.status = 'completed'
      AND e.is_deleted = false
      AND (content_types IS NULL OR e.content_type = ANY(content_types))
      AND (
        (query_embedding_e5 IS NOT NULL AND e.has_e5_embedding AND 
         1 - (e.embedding_e5_small <=> query_embedding_e5) > match_threshold)
        OR
        (query_embedding_bge IS NOT NULL AND e.has_bge_embedding AND 
         1 - (e.embedding_bge_m3 <=> query_embedding_bge) > match_threshold)
      )
  )
  SELECT 
    sr.content_type,
    sr.content_id,
    sr.content_text,
    sr.combined_similarity as similarity,
    sr.chunk_type,
    sr.hierarchy_level,
    sr.word_count,
    sr.sentence_count,
    sr.created_at,
    sr.embedding_types,
    jsonb_build_object(
      'e5_similarity', sr.e5_similarity,
      'bge_similarity', sr.bge_similarity,
      'combined_similarity', sr.combined_similarity,
      'weights', jsonb_build_object('e5', weight_e5, 'bge', weight_bge)
    ) as individual_scores
  FROM scored_results sr
  ORDER BY sr.combined_similarity DESC
  LIMIT match_count;

  -- Update search results count if logging
  IF user_id IS NOT NULL AND search_id IS NOT NULL THEN
    UPDATE embedding_searches 
    SET results_count = (SELECT COUNT(*) FROM scored_results WHERE combined_similarity > match_threshold)
    WHERE id = search_id;
  END IF;
END;
$$;

-- Function to get comprehensive embedding statistics
CREATE OR REPLACE FUNCTION get_dual_embedding_statistics()
RETURNS TABLE (
  total_embeddings bigint,
  dual_embeddings bigint,
  e5_only bigint,
  bge_only bigint,
  incomplete bigint,
  dual_coverage_percent numeric,
  avg_text_length numeric,
  avg_word_count numeric,
  content_type_breakdown jsonb,
  model_info jsonb
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
    ROUND(AVG(word_count), 2) as avg_word_count,
    -- Content type breakdown
    jsonb_object_agg(
      stats.content_type,
      jsonb_build_object(
        'total', stats.type_count,
        'dual', stats.dual_count,
        'e5_only', stats.e5_only_count,
        'bge_only', stats.bge_only_count
      )
    ) as content_type_breakdown,
    -- Model information
    jsonb_build_object(
      'e5_model', (SELECT DISTINCT embedding_e5_model FROM embeddings WHERE has_e5_embedding LIMIT 1),
      'bge_model', (SELECT DISTINCT embedding_bge_model FROM embeddings WHERE has_bge_embedding LIMIT 1),
      'last_updated', MAX(embedding_updated_at)
    ) as model_info
  FROM embeddings e
  CROSS JOIN LATERAL (
    SELECT 
      e.content_type,
      COUNT(*) as type_count,
      COUNT(*) FILTER (WHERE e.has_e5_embedding AND e.has_bge_embedding) as dual_count,
      COUNT(*) FILTER (WHERE e.has_e5_embedding AND NOT e.has_bge_embedding) as e5_only_count,
      COUNT(*) FILTER (WHERE NOT e.has_e5_embedding AND e.has_bge_embedding) as bge_only_count
    FROM embeddings e2 
    WHERE e2.content_type = e.content_type AND e2.status = 'completed' AND e2.is_deleted = false
    GROUP BY e2.content_type
  ) stats
  WHERE e.status = 'completed' AND e.is_deleted = false
  GROUP BY ();
END;
$$;

-- Function to find embeddings that need dual embedding backfill
CREATE OR REPLACE FUNCTION find_incomplete_dual_embeddings(
  limit_count int DEFAULT 50,
  content_type_filter text DEFAULT NULL,
  priority_missing text DEFAULT 'bge' -- 'e5', 'bge', or 'any'
)
RETURNS TABLE (
  id bigint,
  content_type text,
  content_id bigint,
  content_text text,
  has_e5_embedding boolean,
  has_bge_embedding boolean,
  missing_types text[],
  priority_score int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    e.content_text,
    e.has_e5_embedding,
    e.has_bge_embedding,
    CASE 
      WHEN NOT e.has_e5_embedding AND NOT e.has_bge_embedding THEN ARRAY['e5', 'bge']
      WHEN NOT e.has_e5_embedding THEN ARRAY['e5']
      WHEN NOT e.has_bge_embedding THEN ARRAY['bge']
      ELSE ARRAY[]::text[]
    END as missing_types,
    -- Priority score: dual missing = 3, bge missing = 2, e5 missing = 1
    CASE 
      WHEN NOT e.has_e5_embedding AND NOT e.has_bge_embedding THEN 3
      WHEN NOT e.has_bge_embedding THEN 2
      WHEN NOT e.has_e5_embedding THEN 1
      ELSE 0
    END as priority_score,
    e.created_at
  FROM embeddings e
  WHERE 
    e.status = 'completed'
    AND e.is_deleted = false
    AND (content_type_filter IS NULL OR e.content_type = content_type_filter)
    AND (
      CASE priority_missing
        WHEN 'e5' THEN NOT e.has_e5_embedding
        WHEN 'bge' THEN NOT e.has_bge_embedding
        WHEN 'any' THEN (NOT e.has_e5_embedding OR NOT e.has_bge_embedding)
        ELSE (NOT e.has_e5_embedding OR NOT e.has_bge_embedding)
      END
    )
  ORDER BY 
    priority_score DESC,
    e.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to update embedding flags after processing
CREATE OR REPLACE FUNCTION update_embedding_flags(
  p_embedding_id bigint,
  p_embedding_type text, -- 'e5' or 'bge'
  p_success boolean
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_embedding_type = 'e5' THEN
    UPDATE embeddings 
    SET 
      has_e5_embedding = p_success,
      embedding_updated_at = now(),
      updated_at = now()
    WHERE id = p_embedding_id;
  ELSIF p_embedding_type = 'bge' THEN
    UPDATE embeddings 
    SET 
      has_bge_embedding = p_success,
      embedding_updated_at = now(),
      updated_at = now()
    WHERE id = p_embedding_id;
  ELSE
    RETURN false;
  END IF;
  
  RETURN FOUND;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION search_embeddings_e5 IS 'Search using E5-Small embeddings (384d) with content type filtering';
COMMENT ON FUNCTION search_embeddings_bge IS 'Search using BGE-M3 embeddings (1024d) with content type filtering';
COMMENT ON FUNCTION search_embeddings_hybrid IS 'Advanced hybrid search combining E5 and BGE embeddings with configurable weights and detailed scoring';
COMMENT ON FUNCTION get_dual_embedding_statistics IS 'Get comprehensive statistics about dual embedding coverage and performance';
COMMENT ON FUNCTION find_incomplete_dual_embeddings IS 'Find embeddings missing E5 or BGE vectors for prioritized backfilling';
COMMENT ON FUNCTION update_embedding_flags IS 'Update embedding availability flags after processing';
