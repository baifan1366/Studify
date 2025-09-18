-- Migration: Re-enable profile embedding trigger after onboarding refactor
-- Date: 2025-09-17
-- Purpose: Re-enable profile embedding trigger to support onboarding preferences embedding

-- Re-enable the profile embedding trigger
-- This was previously disabled due to signup failures, but is now stable
CREATE TRIGGER profile_embedding_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_profile_embedding();

-- Add comment for documentation
COMMENT ON TRIGGER profile_embedding_trigger ON profiles IS 
'Automatically queues profile data for embedding when profile is created or updated. Monitors changes to display_name, full_name, bio, role, and preferences fields.';
