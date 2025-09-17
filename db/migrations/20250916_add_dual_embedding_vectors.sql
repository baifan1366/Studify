-- Migration: Add dual embedding vector support to video_embeddings table
-- Date: 2025-09-16
-- Purpose: Support both E5-Small (384d) and BGE-M3 (1024d) embeddings

-- Add BGE-M3 embedding column (1024 dimensions)
ALTER TABLE video_embeddings 
ADD COLUMN IF NOT EXISTS embedding_bge_m3 vector(1024);

-- Rename existing embedding column to be more specific
ALTER TABLE video_embeddings 
RENAME COLUMN embedding TO embedding_e5_small;

-- Update embedding_model column to support both models
ALTER TABLE video_embeddings 
ALTER COLUMN embedding_model DROP DEFAULT;

-- Add new columns to track which embeddings are available
ALTER TABLE video_embeddings 
ADD COLUMN IF NOT EXISTS has_e5_embedding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_bge_embedding boolean DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_embeddings_e5_small ON video_embeddings USING ivfflat (embedding_e5_small vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_video_embeddings_bge_m3 ON video_embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops);

-- Add indexes for embedding availability flags
CREATE INDEX IF NOT EXISTS idx_video_embeddings_has_e5 ON video_embeddings (has_e5_embedding) WHERE has_e5_embedding = true;
CREATE INDEX IF NOT EXISTS idx_video_embeddings_has_bge ON video_embeddings (has_bge_embedding) WHERE has_bge_embedding = true;

-- Update existing records to mark E5 embeddings as available
UPDATE video_embeddings 
SET has_e5_embedding = true 
WHERE embedding_e5_small IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN video_embeddings.embedding_e5_small IS 'E5-Small embedding vector (384 dimensions)';
COMMENT ON COLUMN video_embeddings.embedding_bge_m3 IS 'BGE-M3 embedding vector (1024 dimensions)';
COMMENT ON COLUMN video_embeddings.has_e5_embedding IS 'Flag indicating if E5-Small embedding is available';
COMMENT ON COLUMN video_embeddings.has_bge_embedding IS 'Flag indicating if BGE-M3 embedding is available';
