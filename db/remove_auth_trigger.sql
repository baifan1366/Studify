-- Remove the problematic auth trigger that causes user creation failures
-- We'll handle profile creation manually in the API routes instead

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_public_profile_for_user();

-- Note: Profile creation will now be handled manually in:
-- - /api/auth/sign-up
-- - /api/auth/sync (for OAuth users)
-- - /api/auth/google (for Google OAuth users)
