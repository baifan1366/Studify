ALTER TABLE public.course_attachments
  ADD COLUMN IF NOT EXISTS faststart_status text,
  ADD COLUMN IF NOT EXISTS faststart_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS faststart_error text;

ALTER TABLE public.course_attachments
  DROP CONSTRAINT IF EXISTS course_attachments_faststart_status_check;

ALTER TABLE public.course_attachments
  ADD CONSTRAINT course_attachments_faststart_status_check
  CHECK (
    faststart_status IS NULL OR faststart_status IN (
      'disabled',
      'not_applicable',
      'already_optimized',
      'optimized',
      'failed'
    )
  );
