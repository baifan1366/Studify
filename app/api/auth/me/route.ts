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

    // 1. Check Redis cache first
    try {
      const cachedUser = await redis.get(cacheKey);
      if (cachedUser) {
        return NextResponse.json(cachedUser);
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

    const userInfo = {
      ...user,
      profile,
    };

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
