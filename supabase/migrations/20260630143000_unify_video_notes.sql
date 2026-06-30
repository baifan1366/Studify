-- Notes have one canonical home. Preserve legacy generated notes by moving
-- them into course_notes, then retire only the migrated artifact rows.
WITH migrated AS (
  INSERT INTO public.course_notes (
    user_id,
    lesson_id,
    course_id,
    timestamp_sec,
    title,
    content,
    tags,
    note_type,
    created_at,
    updated_at
  )
  SELECT
    user_id,
    lesson_id,
    course_id,
    source_timestamp_sec,
    title,
    COALESCE(content->>'markdown', ''),
    ARRAY['ai-generated', 'video-note', 'migrated-artifact:' || public_id::text],
    'ai_generated',
    created_at,
    updated_at
  FROM public.video_learning_artifacts
  WHERE artifact_type = 'note'
    AND deleted_at IS NULL
  RETURNING tags
)
UPDATE public.video_learning_artifacts artifact
SET deleted_at = now(), updated_at = now()
WHERE artifact.artifact_type = 'note'
  AND artifact.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM migrated
    WHERE ('migrated-artifact:' || artifact.public_id::text) = ANY(migrated.tags)
  );
