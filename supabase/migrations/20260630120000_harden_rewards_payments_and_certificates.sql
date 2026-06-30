-- Rewards and payments must be atomic and replay-safe.
CREATE UNIQUE INDEX IF NOT EXISTS point_redemption_one_completed_per_course
  ON public.point_redemption (user_id, course_id)
  WHERE status = 'completed' AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS tutor_earnings_unique_source
  ON public.tutor_earnings (source_type, source_id)
  WHERE source_id IS NOT NULL AND is_deleted = false;

CREATE OR REPLACE FUNCTION public.redeem_course_with_points(
  p_user_id bigint,
  p_course_id bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_price integer;
  v_redemption_id bigint;
BEGIN
  -- Serializes all balance changes for this user.
  SELECT points INTO v_points
  FROM profiles
  WHERE id = p_user_id AND is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  SELECT cpp.point_price INTO v_price
  FROM course c
  JOIN course_point_price cpp
    ON cpp.course_id = c.id
   AND cpp.is_active = true
   AND cpp.is_deleted = false
  WHERE c.id = p_course_id AND c.is_deleted = false
  ORDER BY cpp.updated_at DESC
  LIMIT 1;

  IF v_price IS NULL OR v_price <= 0 THEN
    RETURN jsonb_build_object('error', 'Course is not available for point redemption');
  END IF;

  IF EXISTS (
    SELECT 1 FROM course_enrollment
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) THEN
    RETURN jsonb_build_object('error', 'Already enrolled in this course');
  END IF;

  IF v_points < v_price THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient points',
      'required', v_price,
      'available', v_points
    );
  END IF;

  INSERT INTO point_redemption (
    user_id, course_id, points_spent, original_price_cents,
    status, redemption_date, completion_date
  )
  SELECT p_user_id, p_course_id, v_price, c.price_cents,
         'completed', now(), now()
  FROM course c WHERE c.id = p_course_id
  RETURNING id INTO v_redemption_id;

  -- The ledger is the balance source of truth; its trigger updates profiles.points.
  INSERT INTO community_points_ledger (user_id, points, reason, ref)
  VALUES (
    p_user_id,
    -v_price,
    'Course redemption',
    jsonb_build_object(
      'type', 'course_redemption',
      'course_id', p_course_id,
      'redemption_id', v_redemption_id
    )
  );

  INSERT INTO course_enrollment (course_id, user_id, role, status)
  VALUES (p_course_id, p_user_id, 'student', 'active');

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'points_spent', v_price,
    'remaining_points', v_points - v_price
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Already enrolled in this course');
END;
$$;

-- Issue one verifiable certificate when every non-deleted lesson is complete.
CREATE OR REPLACE FUNCTION public.issue_course_certificate_on_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id bigint;
  v_total integer;
  v_completed integer;
BEGIN
  IF NEW.state <> 'completed' AND NEW.progress_pct < 95 THEN
    RETURN NEW;
  END IF;

  SELECT course_id INTO v_course_id
  FROM course_lesson
  WHERE id = NEW.lesson_id AND is_deleted = false;

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_total
  FROM course_lesson
  WHERE course_id = v_course_id AND is_deleted = false;

  SELECT count(*) INTO v_completed
  FROM course_lesson l
  WHERE l.course_id = v_course_id
    AND l.is_deleted = false
    AND EXISTS (
      SELECT 1 FROM course_progress p
      WHERE p.user_id = NEW.user_id
        AND p.lesson_id = l.id
        AND p.is_deleted = false
        AND (p.state = 'completed' OR p.progress_pct >= 95)
    );

  IF v_total > 0 AND v_completed = v_total THEN
    INSERT INTO course_certificate (
      user_id, course_id, completion_percentage, issued_at
    ) VALUES (NEW.user_id, v_course_id, 100, now())
    ON CONFLICT (user_id, course_id) DO UPDATE SET
      completion_percentage = 100,
      is_deleted = false,
      updated_at = now();

    UPDATE course_enrollment
    SET status = 'completed', completed_at = COALESCE(completed_at, now()), updated_at = now()
    WHERE user_id = NEW.user_id AND course_id = v_course_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issue_course_certificate ON public.course_progress;
CREATE TRIGGER trg_issue_course_certificate
AFTER INSERT OR UPDATE OF state, progress_pct ON public.course_progress
FOR EACH ROW EXECUTE FUNCTION public.issue_course_certificate_on_progress();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_title text;

CREATE INDEX IF NOT EXISTS course_certificate_profile_display_idx
  ON public.course_certificate (user_id, issued_at DESC)
  WHERE is_deleted = false;
