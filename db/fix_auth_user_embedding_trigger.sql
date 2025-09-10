-- Fix for auth_user_embedding_trigger issue
-- Remove the problematic auth_user embedding trigger completely
-- Use profile embedding instead (which already works with bigint IDs)

-- Drop the existing problematic trigger
DROP TRIGGER IF EXISTS auth_user_embedding_trigger ON auth.users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS trigger_auth_user_embedding();

-- Note: No need to recreate auth_user embedding functionality
-- The profile embedding trigger already handles user data embedding
-- when profiles are created/updated, which is sufficient for search purposes
