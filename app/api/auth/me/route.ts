import { NextResponse } from 'next/server';
import { verifyAppJwt, AppJwtPayload } from '@/utils/auth/jwt';
import redis from '@/utils/redis/redis';
import { createAdminClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('app_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let jwtPayload: AppJwtPayload;
    try {
      jwtPayload = await verifyAppJwt(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if session exists in Redis
    const sessionKey = `session:${jwtPayload.jti}`;
    try {
      const sessionExists = await redis.get(sessionKey);
      if (!sessionExists) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
    } catch (error) {
      console.error('Redis session check error:', error);
      return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
    }

    const userId = jwtPayload.sub;
    const cacheKey = `user:${userId}`;

    // 1. Check Redis cache first - but invalidate stale caches for Google OAuth users
    try {
      const cachedUserStr = await redis.get(cacheKey);
      if (cachedUserStr && typeof cachedUserStr === 'string') {
        const cachedUser = JSON.parse(cachedUserStr);
        console.log('📦 Cached user data:', {
          id: cachedUser.id,
          name: cachedUser.profile?.display_name,
          email: cachedUser.email,
          hasProfile: !!cachedUser.profile
        });
        
        // If cached user has incomplete name info, skip cache and refetch
        if (cachedUser.profile && (!cachedUser.profile.display_name || cachedUser.profile.display_name === cachedUser.email?.split('@')[0])) {
          console.log('⚠️ Cached user has incomplete name info, refetching...');
          await redis.del(cacheKey); // Clear stale cache
        } else {
          console.log('✅ Using cached user data');
          return NextResponse.json(cachedUser);
        }
      }
    } catch (error) {
      console.error('Redis error:', error);
      // Don't block request if redis fails, just log it
    }

    // 2. If not in cache, fetch from Supabase using admin client
    const supabase = await createAdminClient();

    // Fetch user using admin API since we're using service role
    console.log('🔍 Fetching user with ID:', userId);
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError) {
      console.error('❌ User fetch error:', userError);
      return NextResponse.json({ error: 'Failed to fetch user from Supabase' }, { status: 500 });
    }
    if (!user) {
      console.error('❌ No user found for ID:', userId);
      return NextResponse.json({ error: 'User not found in Supabase' }, { status: 404 });
    }

    // Fetch profile from 'profiles' table using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('👤 User info from /api/auth/me:', {
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
      identities: user.identities?.map(identity => ({
        provider: identity.provider,
        identity_data: identity.identity_data
      })),
      profileExists: !!profile,
      profileDisplayName: profile?.display_name,
      profileFullName: profile?.full_name
    });

    // Enhanced name resolution similar to sync API
    const googleName = user.user_metadata?.full_name || 
                      user.user_metadata?.name ||
                      user.user_metadata?.display_name ||
                      user.identities?.[0]?.identity_data?.name ||
                      user.identities?.[0]?.identity_data?.full_name ||
                      user.identities?.[0]?.identity_data?.display_name ||
                      (user.identities?.[0]?.identity_data?.given_name && user.identities?.[0]?.identity_data?.family_name ? 
                        user.identities?.[0]?.identity_data?.given_name + ' ' + user.identities?.[0]?.identity_data?.family_name : null);

    const resolvedDisplayName = profile?.display_name || 
                               profile?.full_name || 
                               googleName || 
                               user.email?.split('@')[0] || "";

    // Enhanced avatar URL resolution
    const avatarUrl = profile?.avatar_url ||
                     user.user_metadata?.avatar_url ||
                     user.user_metadata?.picture ||
                     user.identities?.[0]?.identity_data?.avatar_url ||
                     user.identities?.[0]?.identity_data?.picture;

    // Get online status and last seen from Redis (non-blocking)
    let isOnline = false;
    let lastSeen = null;
    try {
      const [onlineStatus, lastSeenTimestamp] = await Promise.all([
        redis.get(`user:online:${userId}`),
        redis.get(`user:lastseen:${userId}`)
      ]);
      isOnline = onlineStatus === "true" || onlineStatus === true;
      lastSeen = lastSeenTimestamp ? parseInt(lastSeenTimestamp as string) : null;
    } catch (error) {
      console.error('Failed to get online status:', error);
    }

    const userInfo = {
      ...user,
      profile: profile ? {
        ...profile,
        display_name: resolvedDisplayName,
        avatar_url: avatarUrl,
        is_online: isOnline,
        last_seen: lastSeen
      } : null,
    };

    console.log('✅ Final user info from /api/auth/me:', {
      id: userInfo.id,
      email: userInfo.email,
      display_name: userInfo.profile?.display_name,
      avatar_url: userInfo.profile?.avatar_url,
      role: userInfo.profile?.role
    });

    // 3. Store in Redis for future requests (e.g., cache for 1 hour)
    try {
      await redis.set(cacheKey, JSON.stringify(userInfo), { ex: 3600 });
    } catch (error) {
        console.error('Redis SET error:', error);
    }

    return NextResponse.json(userInfo);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
