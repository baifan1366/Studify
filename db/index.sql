-- =========================
-- Database Indexes
-- =========================

-- Embedding indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_content ON embeddings (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_status ON embeddings (status);
CREATE INDEX IF NOT EXISTS idx_embeddings_hash ON embeddings (content_hash);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_type ON embeddings (chunk_type) WHERE chunk_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_hierarchy ON embeddings (hierarchy_level, chunk_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_parent ON embeddings (parent_chunk_id) WHERE parent_chunk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_section ON embeddings (section_title) WHERE section_title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_semantic_density ON embeddings (semantic_density) WHERE semantic_density IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embeddings_language ON embeddings (chunk_language);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_features ON embeddings (has_code_block, has_table, has_list);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_hierarchy ON embeddings (content_type, content_id, hierarchy_level, chunk_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_key_terms ON embeddings USING GIN (key_terms) WHERE key_terms IS NOT NULL;

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status_priority ON embedding_queue (status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_content ON embedding_queue (content_type, content_id);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_embedding_searches_user ON embedding_searches (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_searches_query ON embedding_searches USING gin(to_tsvector('english', query_text));

-- Document hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_document_hierarchy_content ON document_hierarchy (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_document_hierarchy_summary ON document_hierarchy (summary_embedding_id) WHERE summary_embedding_id IS NOT NULL;

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_course_slug ON course (slug) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_lesson_position ON course_lesson (course_id, position) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON course_progress (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user_lesson ON course_notes (user_id, lesson_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_quiz_lesson ON course_quiz_question (lesson_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_concept_course ON course_concept (course_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_course_analytics_user_course ON course_analytics (user_id, course_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_course_discussion_course ON course_discussion (course_id) WHERE is_deleted = false;