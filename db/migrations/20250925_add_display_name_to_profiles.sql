-- Migration: Add display_name field to profiles table
-- Date: 2025-09-25
-- Reason: Fix video comments and danmaku API errors due to missing display_name field

-- Add display_name column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Update existing records to populate display_name
-- Use full_name if available, otherwise use email prefix
UPDATE profiles 
SET display_name = COALESCE(
  NULLIF(full_name, ''), 
  SPLIT_PART(email, '@', 1)
)
WHERE display_name IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.display_name IS 'User display name for UI, fallback from full_name or email prefix';
