-- Migration: Enhance profiles table for profile and settings functionality
-- Date: 2025-09-13
-- Description: Add missing fields and constraints for comprehensive profile management

-- Add any missing columns (using IF NOT EXISTS to avoid errors if they already exist)
DO $$ 
BEGIN
    -- Add full_name if it doesn't exist (it should already exist based on your schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name text;
    END IF;

    -- Add bio if it doesn't exist (it should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio text;
    END IF;

    -- Add timezone if it doesn't exist (it should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'timezone') THEN
        ALTER TABLE profiles ADD COLUMN timezone text DEFAULT 'Asia/Kuala_Lumpur';
    END IF;

    -- Add points if it doesn't exist (it should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'points') THEN
        ALTER TABLE profiles ADD COLUMN points int NOT NULL DEFAULT 0;
    END IF;

    -- Add preferences column for storing user settings as JSONB
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
        ALTER TABLE profiles ADD COLUMN preferences jsonb DEFAULT '{}';
    END IF;

    -- Add theme preference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme') THEN
        ALTER TABLE profiles ADD COLUMN theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));
    END IF;

    -- Add language preference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'language') THEN
        ALTER TABLE profiles ADD COLUMN language text DEFAULT 'en';
    END IF;

    -- Add notification preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notification_settings') THEN
        ALTER TABLE profiles ADD COLUMN notification_settings jsonb DEFAULT '{
            "email_notifications": true,
            "push_notifications": true,
            "course_updates": true,
            "community_updates": false,
            "marketing_emails": false
        }';
    END IF;

    -- Add privacy settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'privacy_settings') THEN
        ALTER TABLE profiles ADD COLUMN privacy_settings jsonb DEFAULT '{
            "profile_visibility": "public",
            "show_email": false,
            "show_progress": true,
            "data_collection": true
        }';
    END IF;

    -- Add two-factor authentication status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE profiles ADD COLUMN two_factor_enabled boolean DEFAULT false;
    END IF;

    -- Add email verification status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
        ALTER TABLE profiles ADD COLUMN email_verified boolean DEFAULT false;
    END IF;

    -- Add profile completion percentage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_completion') THEN
        ALTER TABLE profiles ADD COLUMN profile_completion int DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100);
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(points);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);

-- Create GIN indexes for JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_notification_settings ON profiles USING GIN (notification_settings);
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_settings ON profiles USING GIN (privacy_settings);

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_row profiles)
RETURNS int AS $$
DECLARE
    completion_score int := 0;
    total_fields int := 8; -- Total number of optional profile fields
BEGIN
    -- Check each optional field and add to completion score
    IF profile_row.display_name IS NOT NULL AND profile_row.display_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.full_name IS NOT NULL AND profile_row.full_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.bio IS NOT NULL AND profile_row.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.avatar_url IS NOT NULL AND profile_row.avatar_url != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.timezone IS NOT NULL THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.email IS NOT NULL AND profile_row.email != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.email_verified = true THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF profile_row.onboarded = true THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Return percentage
    RETURN (completion_score * 100) / total_fields;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update profile completion percentage
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_completion := calculate_profile_completion(NEW);
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_profile_completion ON profiles;
CREATE TRIGGER trigger_update_profile_completion
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- Update existing profiles to calculate their completion percentage
UPDATE profiles 
SET profile_completion = calculate_profile_completion(profiles.*),
    updated_at = now()
WHERE profile_completion = 0 OR profile_completion IS NULL;

-- Add helpful comments
COMMENT ON COLUMN profiles.preferences IS 'General user preferences stored as JSONB';
COMMENT ON COLUMN profiles.theme IS 'UI theme preference: light, dark, or system';
COMMENT ON COLUMN profiles.language IS 'Interface language preference';
COMMENT ON COLUMN profiles.notification_settings IS 'Notification preferences stored as JSONB';
COMMENT ON COLUMN profiles.privacy_settings IS 'Privacy settings stored as JSONB';
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether two-factor authentication is enabled';
COMMENT ON COLUMN profiles.email_verified IS 'Whether the email address has been verified';
COMMENT ON COLUMN profiles.profile_completion IS 'Profile completion percentage (0-100)';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
-- GRANT USAGE ON SEQUENCE profiles_id_seq TO authenticated;
