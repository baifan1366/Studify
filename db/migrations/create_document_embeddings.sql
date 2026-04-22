-- Migration: Create document_embeddings table and search functions
-- Purpose: Support PDF document AI question answering

-- 1. Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id BIGSERIAL PRIMARY KEY,
  attachment_id BIGINT NOT NULL REFERENCES course_attachments(id) ON DELETE CASCADE,
  
  -- Document content
  content_text TEXT NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  
  -- Embeddings (dual model)
  embedding_e5 vector(768),
  embedding_bge_m3 vector(1024),
  has_e5_embedding BOOLEAN DEFAULT false,
  has_bge_embedding BOOLEAN DEFAULT false,
  
  -- Metadata
  chunk_index INTEGER NOT NULL,
  chunk_type TEXT DEFAULT 'paragraph', -- 'paragraph', 'section', 'page'
  word_count INTEGER,
  confidence_score FLOAT DEFAULT 1.0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_document_chunk UNIQUE(attachment_id, chunk_index)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_document_embeddings_attachment ON document_embeddings(attachment_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_status ON document_embeddings(status);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_page ON document_embeddings(page_number) WHERE page_number IS NOT NULL;

-- Vector indexes (will be created after data is populated)
-- CREATE INDEX idx_document_embeddings_e5 ON document_embeddings USING ivfflat (embedding_e5 vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_document_embeddings_bge ON document_embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops) WITH (lists = 100);

-- 3. Create E5 search function
CREATE OR REPLACE FUNCTION search_document_embeddings_e5(
  query_embedding vector(768),
  p_attachment_id BIGINT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  content_text TEXT,
  page_number INTEGER,
  section_title TEXT,
  attachment_id BIGINT,
  similarity FLOAT,
  chunk_type TEXT,
  word_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.content_text,
    de.page_number,
    de.section_title,
    de.attachment_id,
    1 - (de.embedding_e5 <=> query_embedding) as similarity,
    de.chunk_type,
    de.word_count
  FROM document_embeddings de
  WHERE 
    de.status = 'completed'
    AND de.has_e5_embedding = true
    AND (p_attachment_id IS NULL OR de.attachment_id = p_attachment_id)
    AND 1 - (de.embedding_e5 <=> query_embedding) > match_threshold
  ORDER BY de.embedding_e5 <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Create two-stage search function (E5 coarse + BGE rerank)
CREATE OR REPLACE FUNCTION search_document_embeddings_two_stage(
  query_embedding_e5 vector(768),
  query_embedding_bge vector(1024),
  p_attachment_id BIGINT DEFAULT NULL,
  e5_threshold FLOAT DEFAULT 0.5,
  e5_candidate_count INT DEFAULT 30,
  final_count INT DEFAULT 10,
  weight_e5 FLOAT DEFAULT 0.3,
  weight_bge FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id BIGINT,
  content_text TEXT,
  page_number INTEGER,
  section_title TEXT,
  attachment_id BIGINT,
  combined_score FLOAT,
  e5_similarity FLOAT,
  bge_similarity FLOAT,
  chunk_type TEXT,
  word_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH e5_candidates AS (
    SELECT 
      de.id,
      de.content_text,
      de.page_number,
      de.section_title,
      de.attachment_id,
      de.embedding_bge_m3,
      de.chunk_type,
      de.word_count,
      1 - (de.embedding_e5 <=> query_embedding_e5) as e5_sim
    FROM document_embeddings de
    WHERE 
      de.status = 'completed'
      AND de.has_e5_embedding = true
      AND de.has_bge_embedding = true
      AND (p_attachment_id IS NULL OR de.attachment_id = p_attachment_id)
      AND 1 - (de.embedding_e5 <=> query_embedding_e5) > e5_threshold
    ORDER BY de.embedding_e5 <=> query_embedding_e5
    LIMIT e5_candidate_count
  )
  SELECT 
    c.id,
    c.content_text,
    c.page_number,
    c.section_title,
    c.attachment_id,
    (weight_e5 * c.e5_sim + weight_bge * (1 - (c.embedding_bge_m3 <=> query_embedding_bge))) as combined_score,
    c.e5_sim as e5_similarity,
    1 - (c.embedding_bge_m3 <=> query_embedding_bge) as bge_similarity,
    c.chunk_type,
    c.word_count
  FROM e5_candidates c
  ORDER BY combined_score DESC
  LIMIT final_count;
END;
$$;

-- 5. Create helper function to get document processing status
CREATE OR REPLACE FUNCTION get_document_processing_status(p_attachment_id BIGINT)
RETURNS TABLE (
  attachment_id BIGINT,
  total_chunks INTEGER,
  completed_chunks INTEGER,
  failed_chunks INTEGER,
  processing_chunks INTEGER,
  has_e5_embeddings INTEGER,
  has_bge_embeddings INTEGER,
  overall_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_attachment_id,
    COUNT(*)::INTEGER as total_chunks,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_chunks,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_chunks,
    COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as processing_chunks,
    COUNT(*) FILTER (WHERE has_e5_embedding = true)::INTEGER as has_e5_embeddings,
    COUNT(*) FILTER (WHERE has_bge_embedding = true)::INTEGER as has_bge_embeddings,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'failed') > 0 THEN 'failed'
      WHEN COUNT(*) FILTER (WHERE status = 'processing') > 0 THEN 'processing'
      WHEN COUNT(*) FILTER (WHERE status = 'completed') = COUNT(*) THEN 'completed'
      ELSE 'pending'
    END as overall_status
  FROM document_embeddings
  WHERE attachment_id = p_attachment_id;
END;
$$;

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_embeddings_updated_at
  BEFORE UPDATE ON document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_document_embeddings_updated_at();

-- 7. Add comments
COMMENT ON TABLE document_embeddings IS 'Stores text chunks and embeddings extracted from PDF documents for AI search';
COMMENT ON COLUMN document_embeddings.embedding_e5 IS 'E5 embedding vector (768 dimensions) for coarse search';
COMMENT ON COLUMN document_embeddings.embedding_bge_m3 IS 'BGE-M3 embedding vector (1024 dimensions) for reranking';
COMMENT ON COLUMN document_embeddings.chunk_type IS 'Type of text chunk: paragraph, section, or page';
COMMENT ON COLUMN document_embeddings.page_number IS 'Page number in the original PDF document';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON document_embeddings TO authenticated;
-- GRANT USAGE ON SEQUENCE document_embeddings_id_seq TO authenticated;
