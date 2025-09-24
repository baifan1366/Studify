// app/api/auth/switch-account/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/server';
import { signAppJwt, generateJti } from '@/utils/auth/jwt';
import redis from '@/utils/redis/redis';

interface SwitchAccountRequest {
  target_user_id: string;
  email?: string; // For verification
}

/**
 * POST /api/auth/switch-account
 * Switch to a different stored account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SwitchAccountRequest;
    const { target_user_id, email } = body;

    if (!target_user_id) {
      return NextResponse.json({ 
        error: 'target_user_id is required' 
      }, { status: 400 });
    }

    // Create admin client to fetch user info
    const supabase = await createAdminClient();

    // Get target user info from Supabase
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(target_user_id);
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Optional email verification
    if (email && user.email !== email) {
      return NextResponse.json({ 
        error: 'Email mismatch' 
      }, { status: 400 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    // Check if user is active
    if (profile.status !== 'active') {
      return NextResponse.json({ 
        error: 'Account is not active' 
      }, { status: 403 });
    }

    // Create new JWT session
    const jti = generateJti();
    const expiresInSeconds = 24 * 60 * 60; // 24 hours

    const appJwt = await signAppJwt({
      sub: user.id,
      role: profile.role as 'student' | 'tutor' | 'admin',
      jti,
      name: profile.display_name || profile.full_name || user.email?.split('@')[0]
    }, expiresInSeconds);

    // Store session in Redis
    const sessionData = {
      user_id: user.id,
      role: profile.role,
      email: user.email,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };

    await redis.set(`session:${jti}`, JSON.stringify(sessionData), { ex: expiresInSeconds });

    // Clear previous user cache if exists
    const cookieStore = await cookies();
    const oldToken = cookieStore.get('app_session')?.value;
    if (oldToken) {
      try {
        const { verifyAppJwt } = await import('@/utils/auth/jwt');
        const oldPayload = await verifyAppJwt(oldToken);
        if (oldPayload) {
          // Clear old session from Redis
          await redis.del(`session:${oldPayload.jti}`);
          // Clear old user cache
          await redis.del(`user:${oldPayload.sub}`);
        }
      } catch (error) {
        // Ignore errors in cleanup
        console.warn('Error cleaning up old session:', error);
      }
    }

    // Set new session cookie
    const response = NextResponse.json({
      message: 'Account switched successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      },
      needsOnboarding: !profile.onboarded
    });

    response.cookies.set('app_session', appJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresInSeconds,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Account switch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
