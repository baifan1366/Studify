// utils/auth/server-guard.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAppJwt, AppJwtPayload } from './jwt';
import redis from '../redis/redis';
import { createAdminClient } from '../supabase/server';

type Role = 'student' | 'tutor' | 'admin';

type UserInfo = {
  id: string;
  email?: string;
  user_metadata?: any;
  app_metadata?: any;
  profile?: any;
  [key: string]: any;
};

type AuthResult = {
  payload: AppJwtPayload;
  user: UserInfo;
  // Backward compatibility - expose sub directly
  sub: string;
};

/**
 * Authorizes a request for a specific role in an App Router API Route and returns user information.
 * @param role The required role ('student', 'tutor', or 'admin').
 * @returns A promise that resolves to one of two possible return types:
 * 
 * **Success Case (Authorization Passed):**
 * Returns `AuthResult` object containing:
 * ```typescript
 * {
 *   payload: {
 *     sub: string;        // User ID from JWT
 *     role: 'student' | 'tutor' | 'admin';  // User role
 *     jti: string;        // JWT ID for session tracking
 *     name?: string;      // Optional user name
 *     iat?: number;       // Issued at timestamp
 *     exp?: number;       // Expiration timestamp
 *   },
 *   user: {
 *     id: string;         // User ID
 *     email?: string;     // User email
 *     user_metadata?: any; // User metadata
 *     app_metadata?: any;  // App metadata
 *     profile?: any;      // User profile from profiles table
 *     [key: string]: any; // Other user properties
 *   },
 *   sub: string;        // User ID from JWT
 * }
 * ```
 * 
 * **Error Cases (Authorization Failed):**
 * Returns `NextResponse` with JSON error and appropriate HTTP status:
 * 
 * - **401 Unauthorized** - Token missing, invalid, or expired:
 *   ```json
 *   { "message": "Authentication token not found." }
 *   { "message": "Invalid token." }
 *   { "message": "Session not found or expired." }
 *   { "message": "Invalid or expired token." }
 *   ```
 * 
 * - **403 Forbidden** - Valid token but insufficient permissions:
 *   ```json
 *   { "message": "Forbidden: Insufficient permissions." }
 *   ```
 * 
 * **Usage Example:**
 * ```typescript
 * const authResult = await authorize('student');
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Return error response
 * }
 * // Use authResult.payload.sub as user ID and authResult.user for user info
 * const userId = authResult.payload.sub;
 * const userEmail = authResult.user.email;
 * ```
 */
export async function authorize(role: Role): Promise<AuthResult | NextResponse> {
  try {
    // 1. 读取 Cookie 里的 App JWT
    const cookieStore = await cookies();
    const token = cookieStore.get('app_session')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Authentication token not found.' }, { status: 401 });
    }

    // 2. 验证签名
    const payload = await verifyAppJwt(token);
    if (!payload) {
      return NextResponse.json({ message: 'Invalid token.' }, { status: 401 });
    }

    // 3. 查 Redis，确认会话还有效
    const session = await redis.get(`session:${payload.jti}`);
    if (!session) {
      return NextResponse.json({ message: 'Session not found or expired.' }, { status: 401 });
    }

    // 4. 权限检查
    if (payload.role !== role) {
      return NextResponse.json({ message: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }

    // 5. 获取用户详细信息
    const userId = payload.sub;
    const cacheKey = `user:${userId}`;

    let userInfo: UserInfo;

    // 先检查 Redis 缓存
    try {
      const cachedUser = await redis.get(cacheKey);
      if (cachedUser) {
        userInfo = typeof cachedUser === 'string' ? JSON.parse(cachedUser) : cachedUser;
      } else {
        // 从 Supabase 获取用户信息
        const supabase = await createAdminClient();
        
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user) {
          return NextResponse.json({ message: 'User not found.' }, { status: 404 });
        }

        // 获取用户 profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        userInfo = {
          ...user,
          profile,
        };

        // 缓存用户信息 1 小时
        try {
          await redis.set(cacheKey, JSON.stringify(userInfo), { ex: 3600 });
        } catch (error) {
          console.error('Redis SET error:', error);
        }
      }
    } catch (error) {
      console.error('User info fetch error:', error);
      return NextResponse.json({ message: 'Failed to fetch user information.' }, { status: 500 });
    }

    // 6. 验证通过，返回 JWT payload 和用户信息
    return {
      payload,
      user: userInfo,
      sub: payload.sub  // Backward compatibility
    };

  } catch (error) {
    console.error('Authorization error:', error);
    return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
  }
}