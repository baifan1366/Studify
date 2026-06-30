ALTER TABLE public.study_session
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS study_session_user_idempotency_key
  ON public.study_session (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS study_session_user_start_active_idx
  ON public.study_session (user_id, session_start DESC)
  WHERE is_deleted = false;

ALTER TABLE public.study_session
  DROP CONSTRAINT IF EXISTS study_session_duration_sane;

ALTER TABLE public.study_session
  ADD CONSTRAINT study_session_duration_sane
  CHECK (
    duration_minutes > 0
    AND duration_minutes <= 720
    AND session_end IS NOT NULL
    AND session_end > session_start
  ) NOT VALID;
