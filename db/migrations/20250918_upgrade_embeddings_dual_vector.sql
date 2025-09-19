-- Migration: Upgrade main embeddings table to dual embedding support
-- Date: 2025-09-18
-- Purpose: Add dual embedding support (E5-Small 384d + BGE-M3 1024d) to main embeddings table

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add BGE-M3 embedding column (1024 dimensions)
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS embedding_bge_m3 vector(1024);

-- Rename existing embedding column to be more specific (E5-Small)
-- Since we can't rename directly if it might break existing code, we'll add the new column first
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS embedding_e5_small vector(384);

-- Copy existing embedding data to the new E5 column
UPDATE embeddings 
SET embedding_e5_small = embedding 
WHERE embedding IS NOT NULL AND embedding_e5_small IS NULL;

-- Add flags to track which embeddings are available
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS has_e5_embedding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_bge_embedding boolean DEFAULT false;

-- Update existing records to mark E5 embeddings as available
UPDATE embeddings 
SET has_e5_embedding = true 
WHERE embedding_e5_small IS NOT NULL;

-- Add embedding model specific tracking
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS embedding_e5_model text DEFAULT 'intfloat/e5-small',
ADD COLUMN IF NOT EXISTS embedding_bge_model text DEFAULT 'BAAI/bge-m3',
ADD COLUMN IF NOT EXISTS embedding_created_at timestamptz,
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- Set initial values for new timestamp columns
UPDATE embeddings 
SET embedding_created_at = created_at,
    embedding_updated_at = updated_at
WHERE embedding_created_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_embeddings_e5_small 
ON embeddings USING ivfflat (embedding_e5_small vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_embeddings_bge_m3 
ON embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops) WITH (lists = 100);

-- Add indexes for embedding availability flags
CREATE INDEX IF NOT EXISTS idx_embeddings_has_e5 
ON embeddings (has_e5_embedding) WHERE has_e5_embedding = true;

CREATE INDEX IF NOT EXISTS idx_embeddings_has_bge 
ON embeddings (has_bge_embedding) WHERE has_bge_embedding = true;

-- Add composite index for dual embedding queries
CREATE INDEX IF NOT EXISTS idx_embeddings_dual_flags 
ON embeddings (has_e5_embedding, has_bge_embedding, status, content_type);

-- Add index for backfill queries
CREATE INDEX IF NOT EXISTS idx_embeddings_incomplete 
ON embeddings (content_type, content_id, has_e5_embedding, has_bge_embedding) 
WHERE status = 'completed' AND is_deleted = false;

-- Update embedding_queue table to support dual embedding processing
ALTER TABLE embedding_queue 
ADD COLUMN IF NOT EXISTS embedding_types text[] DEFAULT ARRAY['e5', 'bge'],
ADD COLUMN IF NOT EXISTS processed_embeddings text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS failed_embeddings text[] DEFAULT ARRAY[]::text[];

-- Add comments for documentation
COMMENT ON COLUMN embeddings.embedding_e5_small IS 'E5-Small embedding vector (384 dimensions) from intfloat/e5-small model';
COMMENT ON COLUMN embeddings.embedding_bge_m3 IS 'BGE-M3 embedding vector (1024 dimensions) from BAAI/bge-m3 model';
COMMENT ON COLUMN embeddings.has_e5_embedding IS 'Flag indicating if E5-Small embedding is available';
COMMENT ON COLUMN embeddings.has_bge_embedding IS 'Flag indicating if BGE-M3 embedding is available';
COMMENT ON COLUMN embeddings.embedding_e5_model IS 'Model name used for E5 embedding generation';
COMMENT ON COLUMN embeddings.embedding_bge_model IS 'Model name used for BGE embedding generation';

-- Update embedding_searches table to support dual embeddings
ALTER TABLE embedding_searches 
ADD COLUMN IF NOT EXISTS query_embedding_bge vector(1024),
ADD COLUMN IF NOT EXISTS search_type text DEFAULT 'hybrid' CHECK (search_type IN ('e5_only', 'bge_only', 'hybrid')),
ADD COLUMN IF NOT EXISTS embedding_weights jsonb DEFAULT '{"e5": 0.4, "bge": 0.6}'::jsonb;

-- Add index for BGE query embeddings
CREATE INDEX IF NOT EXISTS idx_embedding_searches_bge 
ON embedding_searches USING ivfflat (query_embedding_bge vector_cosine_ops) WITH (lists = 50);

-- Add comments for search table
COMMENT ON COLUMN embedding_searches.query_embedding_bge IS 'BGE-M3 query embedding vector (1024 dimensions)';
COMMENT ON COLUMN embedding_searches.search_type IS 'Type of search performed: e5_only, bge_only, or hybrid';
COMMENT ON COLUMN embedding_searches.embedding_weights IS 'Weights used in hybrid search for combining E5 and BGE scores';

-- Create a view for easy dual embedding statistics
CREATE OR REPLACE VIEW dual_embedding_stats AS
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_complete,
  COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as no_embeddings,
  ROUND(
    (COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 2
  ) as dual_coverage_percent,
  content_type
FROM embeddings 
WHERE status = 'completed' AND is_deleted = false
GROUP BY content_type
UNION ALL
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding) as dual_complete,
  COUNT(*) FILTER (WHERE has_e5_embedding AND NOT has_bge_embedding) as e5_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND has_bge_embedding) as bge_only,
  COUNT(*) FILTER (WHERE NOT has_e5_embedding AND NOT has_bge_embedding) as no_embeddings,
  ROUND(
    (COUNT(*) FILTER (WHERE has_e5_embedding AND has_bge_embedding)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 2
  ) as dual_coverage_percent,
  'TOTAL' as content_type
FROM embeddings 
WHERE status = 'completed' AND is_deleted = false;

COMMENT ON VIEW dual_embedding_stats IS 'Statistics view showing dual embedding coverage by content type';
