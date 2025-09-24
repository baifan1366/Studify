// app/api/auth/cleanup-sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAppJwt } from '@/utils/auth/jwt';
import redis from '@/utils/redis/redis';

/**
 * POST /api/auth/cleanup-sessions
 * Clean up old sessions when switching accounts
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('app_session')?.value;

    if (!token) {
      return NextResponse.json({ message: 'No session token found' }, { status: 401 });
    }

    // Get current session info
    const payload = await verifyAppJwt(token);
    if (!payload) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { cleanup_user_id, keep_current = true } = body;

    if (!cleanup_user_id) {
      return NextResponse.json({ message: 'cleanup_user_id is required' }, { status: 400 });
    }

    try {
      // Find and clean up old sessions for the specified user
      const keys = await redis.keys(`session:*`);
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const sessionData = await redis.get(key);
          if (sessionData) {
            const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
            
            // If this session belongs to the cleanup user and it's not the current session
            if (parsed.user_id === cleanup_user_id) {
              const sessionJti = key.replace('session:', '');
              
              // Keep current session if requested
              if (keep_current && sessionJti === payload.jti) {
                continue;
              }
              
              await redis.del(key);
              cleanedCount++;
            }
          }
        } catch (parseError) {
          console.warn('Error parsing session data for key:', key, parseError);
          // Delete corrupted session data
          await redis.del(key);
          cleanedCount++;
        }
      }

      // Also clean up user cache to force refresh
      await redis.del(`user:${cleanup_user_id}`);

      return NextResponse.json({
        message: 'Sessions cleaned up successfully',
        cleaned_sessions: cleanedCount
      });

    } catch (error) {
      console.error('Session cleanup error:', error);
      return NextResponse.json({ 
        message: 'Failed to cleanup sessions' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Cleanup sessions error:', error);
    return NextResponse.json({ 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
