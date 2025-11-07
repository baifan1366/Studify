-- Migration: Add auto_summarize to notification_settings
-- Description: Adds auto_summarize field to notification_settings JSONB column in profiles table
-- Date: 2025-01-08

-- Since notification_settings is a JSONB column, we don't need to alter the table structure
-- The field will be added dynamically when users update their settings
-- However, we can update existing records to include the default value

-- Update existing profiles to include auto_summarize in notification_settings
UPDATE public.profiles
SET notification_settings = notification_settings || '{"auto_summarize": true}'::jsonb
WHERE notification_settings IS NOT NULL
  AND NOT (notification_settings ? 'auto_summarize');

-- For any profiles with NULL notification_settings, set the default
UPDATE public.profiles
SET notification_settings = '{"email_notifications": true, "push_notifications": true, "course_updates": true, "classroom_updates": true, "community_updates": false, "assignment_reminders": true, "live_session_alerts": true, "marketing_emails": false, "daily_digest": true, "weekly_digest": true, "auto_summarize": true}'::jsonb
WHERE notification_settings IS NULL;

