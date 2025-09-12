-- Remove the problematic auth trigger that causes user creation failures
-- We'll handle profile creation manually in the API routes instead

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_public_profile_for_user();

-- Also disable the profile embedding trigger that's causing failures
DROP TRIGGER IF EXISTS profile_embedding_trigger ON profiles;

-- Note: Profile creation will now be handled manually in:
-- - /api/auth/sign-up
-- - /api/auth/sync (for OAuth users)
-- - /api/auth/google (for Google OAuth users)
--
-- Profile embedding trigger disabled to prevent signup failures
-- Re-enable when embedding system is stable
