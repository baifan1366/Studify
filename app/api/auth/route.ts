import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import redis from '@/utils/redis/redis';
import type { Profile } from '@/interface/user/profile-interface';

/**
 * GET handler for retrieving authenticated user information.
 * Uses the 'profiles' table as the single source of truth and implements Redis caching.
 */
export async function GET(req: NextRequest) {
  try {
    // Create the Supabase client to be used for authentication
    const supabase = await createServerClient();

    // Get the current authenticated user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If there's an authentication error or no user, they are not authenticated
    if (authError || !user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="supabase", error="invalid_token"'
          }
        }
      );
    }

    // Define the cache key for this user's profile
    const cacheKey = `user:${user.id}`;
    let profile: Profile | null = null;
    let servedFromCache = false;

    // 1. Try to get the profile from the Redis cache first
    try {
      const cachedProfile = await redis.get(cacheKey);
      if (cachedProfile) {
        profile = JSON.parse(cachedProfile as string) as Profile;
        servedFromCache = true;
        console.log(`Profile for user ${user.id} retrieved from cache.`);
      }
    } catch (cacheError) {
      // If Redis fails, log the error but continue; we'll fetch from the DB instead.
      console.warn('Redis cache read error, falling back to database:', cacheError);
    }

    // 2. If the profile was not in the cache, fetch it from the database
    if (!profile) {
      console.log(`Cache miss for user ${user.id}. Fetching from Supabase.`);
      
      // Select ALL fields defined in the Profile interface
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If no profile exists in the DB for a valid user, it's a "Not Found" error
      if (profileError || !profileData) {
        console.error('Profile not found in database for user:', user.id, profileError);
        return NextResponse.json({
          error: 'Profile not found. Please complete your profile setup.'
        }, { status: 404 });
      }

      // Construct the profile object to EXACTLY match the 'Profile' interface
      profile = {
        id: profileData.id,
        public_id: profileData.public_id,
        user_id: profileData.user_id,
        display_name: profileData.display_name,
        full_name: profileData.full_name,
        email: profileData.email,
        role: profileData.role,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        currency: profileData.currency,
        timezone: profileData.timezone,
        status: profileData.status,
        banned_reason: profileData.banned_reason,
        banned_at: profileData.banned_at,
        points: profileData.points,
        onboarded: profileData.onboarded,
        onboard_step: profileData.onboard_step,
        is_deleted: profileData.is_deleted,
        created_at: profileData.created_at,
        preferences: profileData.preferences,
        theme: profileData.theme,
        language: profileData.language,
        notification_settings: profileData.notification_settings,
        privacy_settings: profileData.privacy_settings,
        two_factor_enabled: profileData.two_factor_enabled,
        email_verified: profileData.email_verified,
        profile_completion: profileData.profile_completion,
        updated_at: profileData.updated_at,
        last_login: profileData.last_login,
        deleted_at: profileData.deleted_at,
      };

      // 3. Cache the newly fetched profile in Redis for future requests
      try {
        // Set cache to expire in 1 hour (3600 seconds)
        await redis.set(cacheKey, JSON.stringify(profile), { ex: 3600 });
        console.log(`Profile for user ${user.id} has been cached.`);
      } catch (cacheError) {
        // If caching fails, just log it. The request should still succeed.
        console.warn('Failed to write profile to Redis cache:', cacheError);
      }
    }

    // Return the final user profile data
    return NextResponse.json({
      user: profile,
      servedFromCache: servedFromCache 
    });

  } catch (error) {
    // Catch-all for any other unexpected errors
    console.error('An unexpected error occurred in the auth API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for invalidating the user profile cache.
 * This should be called whenever a user's profile data is updated.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Invalidate the cache by deleting the key
    const cacheKey = `user:${user.id}`;
    try {
      await redis.del(cacheKey);
      console.log('Profile cache invalidated for user:', user.id);
    } catch (cacheError) {
      console.warn('Failed to invalidate cache:', cacheError);
      // Don't fail the request if cache invalidation fails, but it should be monitored
    }

    return NextResponse.json({ message: 'Cache invalidated successfully' });

  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}