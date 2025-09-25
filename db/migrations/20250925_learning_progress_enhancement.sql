-- ========================================
-- Learning Progress Enhancement System
-- Date: 2025-09-25
-- Purpose: Enhance learning progress tracking with video position and continue watching functionality
-- ========================================

-- Add video position tracking to course_progress table
DO $$ 
BEGIN
  -- Add video_position_sec if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'course_progress' AND column_name = 'video_position_sec') THEN
    ALTER TABLE course_progress ADD COLUMN video_position_sec int DEFAULT 0;
  END IF;
  
  -- Add video_duration_sec if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'course_progress' AND column_name = 'video_duration_sec') THEN
    ALTER TABLE course_progress ADD COLUMN video_duration_sec int DEFAULT 0;
  END IF;
  
  -- Add last_accessed_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'course_progress' AND column_name = 'last_accessed_at') THEN
    ALTER TABLE course_progress ADD COLUMN last_accessed_at timestamptz DEFAULT now();
  END IF;
  
  -- Add lesson_kind if it doesn't exist (for different content types)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'course_progress' AND column_name = 'lesson_kind') THEN
    ALTER TABLE course_progress ADD COLUMN lesson_kind text DEFAULT 'video';
  END IF;
  
  -- Add is_continue_watching flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'course_progress' AND column_name = 'is_continue_watching') THEN
    ALTER TABLE course_progress ADD COLUMN is_continue_watching boolean DEFAULT false;
  END IF;
  
  -- Add is_deleted flag if it doesn't exist (for consistency with other tables)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'course_progress' AND column_name = 'is_deleted') THEN
    ALTER TABLE course_progress ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create continue watching view for dashboard
CREATE OR REPLACE VIEW continue_watching_view AS
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
  -- Lesson information
  cl.public_id as lesson_public_id,
  cl.title as lesson_title,
  cl.kind as lesson_content_kind,
  cl.content_url,
  cl.duration_sec as lesson_duration_sec,
  -- Module information
  cm.title as module_title,
  cm.position as module_position,
  -- Course information  
  c.id as course_id,
  c.slug as course_slug,
  c.title as course_title,
  c.thumbnail_url as course_thumbnail,
  -- Calculate continue watching score (recent + progress)
  CASE 
    WHEN cp.state = 'in_progress' AND cp.progress_pct > 5 AND cp.progress_pct < 95 THEN
      -- Higher score for recent access and partial progress
      (EXTRACT(EPOCH FROM (now() - cp.last_accessed_at)) / 86400.0) * -1 + cp.progress_pct
    ELSE 0
  END as continue_score
FROM course_progress cp
JOIN course_lesson cl ON cp.lesson_id = cl.id
JOIN course_module cm ON cl.module_id = cm.id  
JOIN course c ON cm.course_id = c.id
WHERE 
  cp.is_deleted = false 
  AND cl.is_deleted = false 
  AND cm.is_deleted = false 
  AND c.is_deleted = false
  AND cp.state = 'in_progress'
  AND cp.progress_pct > 5  -- More than 5% watched
  AND cp.progress_pct < 95 -- Less than 95% completed (not finished)
  AND cp.last_accessed_at > now() - interval '30 days' -- Accessed within 30 days
ORDER BY continue_score DESC;

-- Create function to update continue watching status
CREATE OR REPLACE FUNCTION update_continue_watching_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_continue_watching flag based on progress
  NEW.is_continue_watching := (
    NEW.state = 'in_progress' 
    AND NEW.progress_pct > 5 
    AND NEW.progress_pct < 95
    AND NEW.video_position_sec > 0
  );
  
  -- Update last_accessed_at when progress changes
  IF TG_OP = 'UPDATE' AND (
    OLD.progress_pct != NEW.progress_pct 
    OR OLD.video_position_sec != NEW.video_position_sec
    OR OLD.state != NEW.state
  ) THEN
    NEW.last_accessed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for continue watching updates
DROP TRIGGER IF EXISTS course_progress_continue_watching_trigger ON course_progress;
CREATE TRIGGER course_progress_continue_watching_trigger
  BEFORE INSERT OR UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION update_continue_watching_status();

-- Create index for continue watching queries
CREATE INDEX IF NOT EXISTS idx_course_progress_continue_watching 
ON course_progress(user_id, is_continue_watching, last_accessed_at DESC) 
WHERE is_continue_watching = true AND is_deleted = false;

-- Create index for user progress queries
CREATE INDEX IF NOT EXISTS idx_course_progress_user_lesson 
ON course_progress(user_id, lesson_id) WHERE is_deleted = false;

-- Add comments for documentation
COMMENT ON COLUMN course_progress.video_position_sec IS 'Current playback position in seconds for video lessons';
COMMENT ON COLUMN course_progress.video_duration_sec IS 'Total video duration in seconds at time of last update';
COMMENT ON COLUMN course_progress.last_accessed_at IS 'Timestamp when user last accessed this lesson';
COMMENT ON COLUMN course_progress.lesson_kind IS 'Type of lesson content (video, document, quiz, etc.)';
COMMENT ON COLUMN course_progress.is_continue_watching IS 'Whether this lesson qualifies for continue watching (5-95% progress)';
COMMENT ON COLUMN course_progress.is_deleted IS 'Soft deletion flag for course progress records';

COMMENT ON VIEW continue_watching_view IS 'View for dashboard continue watching functionality';
COMMENT ON FUNCTION update_continue_watching_status() IS 'Automatically updates continue watching flags and timestamps';

-- Create API-friendly function to get continue watching items
CREATE OR REPLACE FUNCTION get_continue_watching_for_user(
  p_user_id bigint,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  lesson_public_id uuid,
  lesson_title text,
  course_slug text,
  course_title text,
  course_thumbnail text,
  module_title text,
  progress_pct numeric,
  video_position_sec int,
  video_duration_sec int,
  last_accessed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cw.lesson_public_id,
    cw.lesson_title,
    cw.course_slug,
    cw.course_title,
    cw.course_thumbnail,
    cw.module_title,
    cw.progress_pct,
    cw.video_position_sec,
    cw.video_duration_sec,
    cw.last_accessed_at
  FROM continue_watching_view cw
  WHERE cw.user_id = p_user_id
  ORDER BY cw.continue_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_continue_watching_for_user(bigint, int) IS 'Get continue watching items for dashboard display';
