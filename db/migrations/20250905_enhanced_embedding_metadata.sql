-- Enhanced Embedding Metadata Migration
-- Adds support for semantic chunking and enhanced metadata

-- Add new columns to embeddings table for enhanced metadata
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS chunk_type text CHECK (chunk_type IN ('summary', 'section', 'paragraph', 'detail'));
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS hierarchy_level int DEFAULT 0;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS parent_chunk_id bigint REFERENCES embeddings(id);
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS section_title text;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS semantic_density float CHECK (semantic_density >= 0 AND semantic_density <= 1);
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS key_terms text[];
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS sentence_count int DEFAULT 0;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS word_count int DEFAULT 0;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_code_block boolean DEFAULT false;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_table boolean DEFAULT false;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_list boolean DEFAULT false;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS chunk_language text DEFAULT 'en';

-- Create indexes for enhanced metadata queries
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_type ON embeddings (chunk_type) WHERE chunk_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_hierarchy ON embeddings (hierarchy_level, chunk_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_parent ON embeddings (parent_chunk_id) WHERE parent_chunk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_section ON embeddings (section_title) WHERE section_title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_semantic_density ON embeddings (semantic_density) WHERE semantic_density IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_language ON embeddings (chunk_language);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_features ON embeddings (has_code_block, has_table, has_list);

-- Composite index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_embeddings_content_hierarchy ON embeddings (content_type, content_id, hierarchy_level, chunk_type);

-- Index for key terms search (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_embeddings_key_terms ON embeddings USING GIN (key_terms) WHERE key_terms IS NOT NULL;

-- Create document hierarchy table for storing document structure
CREATE TABLE IF NOT EXISTS document_hierarchy (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Content identification
  content_type text NOT NULL,
  content_id bigint NOT NULL,
  
  -- Document structure
  document_title text,
  document_structure jsonb, -- Stores the hierarchical structure
  summary_embedding_id bigint REFERENCES embeddings(id),
  
  -- Statistics
  total_chunks int DEFAULT 0,
  estimated_reading_time int DEFAULT 0, -- in minutes
  has_table_of_contents boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure uniqueness per content
  UNIQUE(content_type, content_id)
);

-- Index for document hierarchy queries
CREATE INDEX IF NOT EXISTS idx_document_hierarchy_content ON document_hierarchy (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_document_hierarchy_summary ON document_hierarchy (summary_embedding_id) WHERE summary_embedding_id IS NOT NULL;

-- Create function to update embedding metadata statistics
CREATE OR REPLACE FUNCTION update_embedding_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update word count if not set
  IF NEW.word_count = 0 THEN
    NEW.word_count = array_length(string_to_array(trim(NEW.content_text), ' '), 1);
  END IF;
  
  -- Update sentence count if not set
  IF NEW.sentence_count = 0 THEN
    NEW.sentence_count = array_length(
      string_to_array(
        regexp_replace(NEW.content_text, '[.!?。！？]+', '|', 'g'), 
        '|'
      ), 
      1
    );
  END IF;
  
  -- Detect content features if not set
  IF NEW.has_code_block IS NULL THEN
    NEW.has_code_block = NEW.content_text ~ '```[\s\S]*?```|`[^`]+`';
  END IF;
  
  IF NEW.has_table IS NULL THEN
    NEW.has_table = NEW.content_text ~ '\|.*\||┌.*┐';
  END IF;
  
  IF NEW.has_list IS NULL THEN
    NEW.has_list = NEW.content_text ~ '^[\s]*[-*+]\s|^[\s]*\d+\.\s';
  END IF;
  
  -- Set default chunk type if not specified
  IF NEW.chunk_type IS NULL THEN
    IF length(NEW.content_text) < 200 THEN
      NEW.chunk_type = 'detail';
      NEW.hierarchy_level = 3;
    ELSIF length(NEW.content_text) > 800 THEN
      NEW.chunk_type = 'section';
      NEW.hierarchy_level = 1;
    ELSE
      NEW.chunk_type = 'paragraph';
      NEW.hierarchy_level = 2;
    END IF;
  END IF;
  
  -- Detect language if not set
  IF NEW.chunk_language = 'en' AND NEW.content_text ~ '[\u4e00-\u9fff]' THEN
    -- Simple Chinese detection
    IF (length(regexp_replace(NEW.content_text, '[^\u4e00-\u9fff]', '', 'g')) * 1.0 / 
        length(regexp_replace(NEW.content_text, '\s', '', 'g'))) > 0.3 THEN
      NEW.chunk_language = 'zh';
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic metadata updates
DROP TRIGGER IF EXISTS trigger_update_embedding_stats ON embeddings;
CREATE TRIGGER trigger_update_embedding_stats
  BEFORE INSERT OR UPDATE ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_stats();

-- Function to get enhanced embedding statistics
CREATE OR REPLACE FUNCTION get_enhanced_embedding_stats()
RETURNS TABLE(
  total_embeddings bigint,
  by_content_type jsonb,
  by_chunk_type jsonb,
  by_language jsonb,
  by_hierarchy_level jsonb,
  avg_semantic_density float,
  content_features jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_embeddings,
    
    -- Group by content type
    jsonb_object_agg(
      content_type, 
      content_type_count
    ) as by_content_type,
    
    -- Group by chunk type
    jsonb_object_agg(
      COALESCE(chunk_type, 'unknown'), 
      chunk_type_count
    ) as by_chunk_type,
    
    -- Group by language
    jsonb_object_agg(
      chunk_language, 
      language_count
    ) as by_language,
    
    -- Group by hierarchy level
    jsonb_object_agg(
      hierarchy_level::text, 
      hierarchy_count
    ) as by_hierarchy_level,
    
    -- Average semantic density
    AVG(semantic_density) as avg_semantic_density,
    
    -- Content features statistics
    jsonb_build_object(
      'has_code_block', SUM(CASE WHEN has_code_block THEN 1 ELSE 0 END),
      'has_table', SUM(CASE WHEN has_table THEN 1 ELSE 0 END),
      'has_list', SUM(CASE WHEN has_list THEN 1 ELSE 0 END)
    ) as content_features
    
  FROM (
    SELECT 
      content_type,
      chunk_type,
      chunk_language,
      hierarchy_level,
      semantic_density,
      has_code_block,
      has_table,
      has_list,
      COUNT(*) OVER (PARTITION BY content_type) as content_type_count,
      COUNT(*) OVER (PARTITION BY chunk_type) as chunk_type_count,
      COUNT(*) OVER (PARTITION BY chunk_language) as language_count,
      COUNT(*) OVER (PARTITION BY hierarchy_level) as hierarchy_count
    FROM embeddings 
    WHERE status = 'completed' AND is_deleted = false
  ) stats
  GROUP BY ();
END;
$$ LANGUAGE plpgsql;

-- Function for semantic search with enhanced filtering
CREATE OR REPLACE FUNCTION search_embeddings_enhanced(
  query_embedding vector(384),
  content_types text[] DEFAULT NULL,
  chunk_types text[] DEFAULT NULL,
  languages text[] DEFAULT NULL,
  hierarchy_levels int[] DEFAULT NULL,
  min_semantic_density float DEFAULT NULL,
  has_features jsonb DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  public_id uuid,
  content_type text,
  content_id bigint,
  content_text text,
  chunk_type text,
  hierarchy_level int,
  section_title text,
  semantic_density float,
  key_terms text[],
  similarity_score float,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.public_id,
    e.content_type,
    e.content_id,
    e.content_text,
    e.chunk_type,
    e.hierarchy_level,
    e.section_title,
    e.semantic_density,
    e.key_terms,
    (e.embedding <=> query_embedding) * -1 + 1 as similarity_score,
    e.created_at
  FROM embeddings e
  WHERE 
    e.status = 'completed' 
    AND e.is_deleted = false
    AND (e.embedding <=> query_embedding) <= (1 - similarity_threshold)
    AND (content_types IS NULL OR e.content_type = ANY(content_types))
    AND (chunk_types IS NULL OR e.chunk_type = ANY(chunk_types))
    AND (languages IS NULL OR e.chunk_language = ANY(languages))
    AND (hierarchy_levels IS NULL OR e.hierarchy_level = ANY(hierarchy_levels))
    AND (min_semantic_density IS NULL OR e.semantic_density >= min_semantic_density)
    AND (
      has_features IS NULL OR (
        (has_features->>'has_code_block' IS NULL OR 
         e.has_code_block = (has_features->>'has_code_block')::boolean) AND
        (has_features->>'has_table' IS NULL OR 
         e.has_table = (has_features->>'has_table')::boolean) AND
        (has_features->>'has_list' IS NULL OR 
         e.has_list = (has_features->>'has_list')::boolean)
      )
    )
  ORDER BY e.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
