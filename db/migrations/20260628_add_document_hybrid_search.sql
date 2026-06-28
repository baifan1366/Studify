ALTER TABLE public.document_embeddings
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(section_title, '') || ' ' || content_text)
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_document_embeddings_search_vector
  ON public.document_embeddings USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.search_document_embeddings_hybrid(
  query_text text,
  query_embedding_e5 vector(384),
  query_embedding_bge vector(1024),
  p_attachment_id bigint DEFAULT NULL,
  dense_candidate_count integer DEFAULT 40,
  lexical_candidate_count integer DEFAULT 40,
  final_count integer DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  content_text text,
  page_number integer,
  section_title text,
  attachment_id bigint,
  combined_score double precision,
  e5_similarity double precision,
  bge_similarity double precision,
  lexical_score double precision,
  chunk_type text,
  word_count integer
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', query_text) AS tsq
  ),
  dense AS (
    SELECT
      de.id,
      row_number() OVER (
        ORDER BY de.embedding_e5 <=> query_embedding_e5
      ) AS dense_rank,
      1 - (de.embedding_e5 <=> query_embedding_e5) AS e5_score
    FROM public.document_embeddings de
    WHERE de.status = 'completed'
      AND de.has_e5_embedding
      AND de.embedding_e5 IS NOT NULL
      AND (p_attachment_id IS NULL OR de.attachment_id = p_attachment_id)
    ORDER BY de.embedding_e5 <=> query_embedding_e5
    LIMIT dense_candidate_count
  ),
  lexical AS (
    SELECT
      de.id,
      row_number() OVER (
        ORDER BY ts_rank_cd(de.search_vector, q.tsq) DESC
      ) AS lexical_rank,
      ts_rank_cd(de.search_vector, q.tsq)::double precision AS lexical_score
    FROM public.document_embeddings de
    CROSS JOIN q
    WHERE de.status = 'completed'
      AND de.search_vector @@ q.tsq
      AND (p_attachment_id IS NULL OR de.attachment_id = p_attachment_id)
    ORDER BY lexical_score DESC
    LIMIT lexical_candidate_count
  ),
  fused AS (
    SELECT
      coalesce(d.id, l.id) AS id,
      coalesce(1.0 / (60 + d.dense_rank), 0)
        + coalesce(1.0 / (60 + l.lexical_rank), 0) AS rrf_score,
      coalesce(d.e5_score, 0) AS e5_score,
      coalesce(l.lexical_score, 0) AS lexical_score
    FROM dense d
    FULL OUTER JOIN lexical l ON l.id = d.id
  )
  SELECT
    de.id,
    de.content_text,
    de.page_number,
    de.section_title,
    de.attachment_id,
    (
      f.rrf_score
      + CASE
          WHEN de.has_bge_embedding AND de.embedding_bge_m3 IS NOT NULL
            THEN 0.01 * (1 - (de.embedding_bge_m3 <=> query_embedding_bge))
          ELSE 0
        END
    )::double precision,
    f.e5_score,
    CASE
      WHEN de.has_bge_embedding AND de.embedding_bge_m3 IS NOT NULL
        THEN 1 - (de.embedding_bge_m3 <=> query_embedding_bge)
      ELSE f.e5_score
    END,
    f.lexical_score,
    de.chunk_type,
    de.word_count
  FROM fused f
  JOIN public.document_embeddings de ON de.id = f.id
  ORDER BY 6 DESC
  LIMIT final_count;
$$;
