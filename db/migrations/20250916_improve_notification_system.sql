-- Improve notification system based on OneSignal best practices
-- Migration: 20250916_improve_notification_system.sql

BEGIN;

-- Add OneSignal specific fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onesignal_player_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onesignal_external_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription_status text DEFAULT 'unknown' 
  CHECK (push_subscription_status IN ('subscribed', 'unsubscribed', 'unknown'));

-- Add indexes for OneSignal fields
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id ON profiles(onesignal_player_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_external_id ON profiles(onesignal_external_id);

-- Enhance notification_settings with more granular controls
UPDATE profiles SET notification_settings = notification_settings || '{
  "classroom_notifications": true,
  "assignment_reminders": true,
  "live_session_alerts": true,
  "grade_notifications": true,
  "community_mentions": true,
  "direct_messages": true,
  "system_announcements": true,
  "marketing_notifications": false,
  "digest_frequency": "daily"
}'::jsonb WHERE notification_settings IS NOT NULL;

-- Add notification delivery tracking
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id bigserial PRIMARY KEY,
  notification_id bigint NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('push', 'email', 'sms', 'in_app')),
  onesignal_notification_id text, -- OneSignal's notification ID
  delivery_status text NOT NULL DEFAULT 'pending' 
    CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'clicked', 'dismissed')),
  delivery_response jsonb, -- Store OneSignal API response
  attempted_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_onesignal_id ON notification_delivery_log(onesignal_notification_id);

-- Add notification categories for better organization
CREATE TABLE IF NOT EXISTS notification_categories (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  default_enabled boolean NOT NULL DEFAULT true,
  icon text, -- Icon name for UI
  color text, -- Color code for UI
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default notification categories
INSERT INTO notification_categories (name, display_name, description, icon, color) VALUES
  ('course', 'Course Updates', 'New lessons, assignments, and course announcements', 'BookOpen', '#3B82F6'),
  ('classroom', 'Classroom', 'Live sessions, quizzes, and classroom activities', 'Users', '#10B981'),
  ('community', 'Community', 'Posts, comments, and community interactions', 'MessageSquare', '#8B5CF6'),
  ('system', 'System', 'Important system announcements and updates', 'Bell', '#F59E0B'),
  ('achievement', 'Achievements', 'Badges, certificates, and milestones', 'Award', '#EF4444'),
  ('reminder', 'Reminders', 'Assignment deadlines and scheduled events', 'Clock', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Add category reference to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category_id bigint REFERENCES notification_categories(id);

-- Add notification templates for consistency
CREATE TABLE IF NOT EXISTS notification_templates (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category_id bigint NOT NULL REFERENCES notification_categories(id),
  title_template text NOT NULL, -- Template with placeholders like {{user_name}}
  message_template text NOT NULL,
  action_url_template text, -- Deep link template
  icon_url text,
  default_channels text[] DEFAULT ARRAY['push', 'in_app'], -- Which channels to use by default
  variables jsonb, -- Expected variables and their types
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert common notification templates
INSERT INTO notification_templates (name, category_id, title_template, message_template, action_url_template, variables) VALUES
  ('new_course_lesson', 
   (SELECT id FROM notification_categories WHERE name = 'course'), 
   'New lesson available: {{lesson_title}}',
   'A new lesson "{{lesson_title}}" is now available in {{course_title}}',
   '/course/{{course_slug}}/lesson/{{lesson_slug}}',
   '{"lesson_title": "string", "course_title": "string", "course_slug": "string", "lesson_slug": "string"}'::jsonb),
  
  ('assignment_due_soon',
   (SELECT id FROM notification_categories WHERE name = 'reminder'),
   'Assignment due in {{hours}} hours',
   'Your assignment "{{assignment_title}}" is due in {{hours}} hours',
   '/classroom/{{classroom_slug}}/assignment/{{assignment_id}}',
   '{"assignment_title": "string", "hours": "number", "classroom_slug": "string", "assignment_id": "string"}'::jsonb),
   
  ('live_session_starting',
   (SELECT id FROM notification_categories WHERE name = 'classroom'),
   'Live session starting soon',
   'The live session "{{session_title}}" starts in {{minutes}} minutes',
   '/classroom/{{classroom_slug}}/live/{{session_id}}',
   '{"session_title": "string", "minutes": "number", "classroom_slug": "string", "session_id": "string"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add user notification preferences per category
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES notification_categories(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time, -- e.g., '22:00:00'
  quiet_hours_end time,   -- e.g., '08:00:00'
  timezone text DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Create function to get user's notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id bigint, p_category_name text)
RETURNS TABLE (
  push_enabled boolean,
  email_enabled boolean,
  in_app_enabled boolean,
  sms_enabled boolean,
  is_quiet_hours boolean
) AS $$
DECLARE
  category_record RECORD;
  pref_record RECORD;
  current_time_in_tz time;
BEGIN
  -- Get category
  SELECT id INTO category_record FROM notification_categories WHERE name = p_category_name;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get user preferences (create default if not exists)
  SELECT * INTO pref_record 
  FROM user_notification_preferences 
  WHERE user_id = p_user_id AND category_id = category_record.id;
  
  IF NOT FOUND THEN
    -- Insert default preferences
    INSERT INTO user_notification_preferences (user_id, category_id)
    VALUES (p_user_id, category_record.id)
    RETURNING * INTO pref_record;
  END IF;
  
  -- Check if current time is in quiet hours
  current_time_in_tz := (now() AT TIME ZONE COALESCE(pref_record.timezone, 'UTC'))::time;
  
  RETURN QUERY SELECT 
    pref_record.push_enabled,
    pref_record.email_enabled,
    pref_record.in_app_enabled,
    pref_record.sms_enabled,
    CASE 
      WHEN pref_record.quiet_hours_start IS NULL OR pref_record.quiet_hours_end IS NULL THEN false
      WHEN pref_record.quiet_hours_start <= pref_record.quiet_hours_end THEN
        current_time_in_tz BETWEEN pref_record.quiet_hours_start AND pref_record.quiet_hours_end
      ELSE
        current_time_in_tz >= pref_record.quiet_hours_start OR current_time_in_tz <= pref_record.quiet_hours_end
    END as is_quiet_hours;
END;
$$ LANGUAGE plpgsql;

COMMIT;
