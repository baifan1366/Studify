CREATE OR REPLACE VIEW public.continue_watching_view AS
SELECT
  cp.id,
  cp.public_id,
  cp.user_id,
  cp.lesson_id,
  cp.state,
  cp.progress_pct,
  cp.video_position_sec,
  cp.video_duration_sec,
  cp.last_accessed_at,
  cp.lesson_kind,
  cl.public_id AS lesson_public_id,
  cl.title AS lesson_title,
  cl.kind AS lesson_content_kind,
  cl.content_url,
  cl.duration_sec AS lesson_duration_sec,
  COALESCE(cm.title, 'Course content') AS module_title,
  COALESCE(cm.position, 0) AS module_position,
  c.id AS course_id,
  c.slug AS course_slug,
  c.title AS course_title,
  c.thumbnail_url AS course_thumbnail,
  (
    EXTRACT(EPOCH FROM (now() - cp.last_accessed_at)) / 86400.0 * -1
    + LEAST(cp.progress_pct, 90)
    + CASE WHEN cp.video_position_sec >= 30 THEN 5 ELSE 0 END
  ) AS continue_score
FROM public.course_progress cp
JOIN public.course_lesson cl
  ON cp.lesson_id = cl.id
LEFT JOIN public.course_module cm
  ON cl.module_id = cm.id AND cm.is_deleted = false
JOIN public.course c
  ON c.id = COALESCE(cl.course_id, cm.course_id)
WHERE cp.is_deleted = false
  AND cl.is_deleted = false
  AND c.is_deleted = false
  AND cp.lesson_kind = 'video'
  AND cp.state = 'in_progress'
  AND cp.video_position_sec >= 5
  AND cp.progress_pct < 95
  AND (
    cp.video_duration_sec <= 0
    OR cp.video_duration_sec - cp.video_position_sec > 10
  )
  AND cp.last_accessed_at > now() - interval '30 days';

COMMENT ON VIEW public.continue_watching_view IS
  'Resume-ready video progress. Eligibility is based on real watch position, not a percentage threshold.';
