WITH ranked_segments AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY attachment_id, segment_index
      ORDER BY
        CASE WHEN status = 'completed' THEN 0 ELSE 1 END,
        updated_at DESC,
        id DESC
    ) AS duplicate_rank
  FROM public.video_embeddings
  WHERE is_deleted = false
    AND chunk_type = 'segment'
    AND segment_index IS NOT NULL
)
UPDATE public.video_embeddings AS embedding
SET
  is_deleted = true,
  deleted_at = now(),
  updated_at = now()
FROM ranked_segments
WHERE embedding.id = ranked_segments.id
  AND ranked_segments.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_embeddings_active_segment
ON public.video_embeddings (attachment_id, segment_index)
WHERE is_deleted = false
  AND chunk_type = 'segment'
  AND segment_index IS NOT NULL;
