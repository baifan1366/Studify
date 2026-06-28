CREATE OR REPLACE FUNCTION public.replace_video_embeddings(
  p_attachment_id bigint,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF p_attachment_id IS NULL OR p_attachment_id <= 0 THEN
    RAISE EXCEPTION 'invalid attachment id';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'embedding rows must be a non-empty array';
  END IF;

  DELETE FROM public.video_embeddings
  WHERE attachment_id = p_attachment_id
    AND chunk_type IN ('segment', 'summary');

  INSERT INTO public.video_embeddings (
    attachment_id,
    content_type,
    content_text,
    chunk_type,
    hierarchy_level,
    embedding_e5_small,
    embedding_bge_m3,
    has_e5_embedding,
    has_bge_embedding,
    segment_start_time,
    segment_end_time,
    segment_index,
    total_segments,
    word_count,
    sentence_count,
    confidence_score,
    embedding_model,
    language,
    status,
    is_deleted
  )
  SELECT
    p_attachment_id,
    coalesce(row->>'content_type', 'course'),
    row->>'content_text',
    'segment',
    coalesce((row->>'hierarchy_level')::integer, 1),
    CASE
      WHEN row->'embedding_e5_small' IS NOT NULL
        AND row->'embedding_e5_small' <> 'null'::jsonb
        THEN (row->'embedding_e5_small')::text::vector(384)
      ELSE NULL
    END,
    CASE
      WHEN row->'embedding_bge_m3' IS NOT NULL
        AND row->'embedding_bge_m3' <> 'null'::jsonb
        THEN (row->'embedding_bge_m3')::text::vector(1024)
      ELSE NULL
    END,
    coalesce((row->>'has_e5_embedding')::boolean, false),
    coalesce((row->>'has_bge_embedding')::boolean, false),
    (row->>'segment_start_time')::double precision,
    (row->>'segment_end_time')::double precision,
    (row->>'segment_index')::integer,
    (row->>'total_segments')::integer,
    coalesce((row->>'word_count')::integer, 0),
    coalesce((row->>'sentence_count')::integer, 0),
    coalesce((row->>'confidence_score')::double precision, 1.0),
    row->>'embedding_model',
    coalesce(row->>'language', 'auto'),
    'completed',
    false
  FROM jsonb_array_elements(p_rows) row;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_video_embeddings(bigint, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_video_embeddings(bigint, jsonb)
  TO service_role;
