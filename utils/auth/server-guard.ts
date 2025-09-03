// utils/auth/server-guard.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAppJwt, AppJwtPayload } from './jwt';
import redis from '../redis/redis';

type Role = 'student' | 'tutor' | 'admin';

/**
 * Authorizes a request for a specific role in an App Router API Route.
 * @param role The required role ('student', 'tutor', or 'admin').
 * @returns A promise that resolves to one of two possible return types:
 * 
 * **Success Case (Authorization Passed):**
 * Returns `AppJwtPayload` object containing:
 * ```typescript
 * {
 *   sub: string;        // User ID from JWT
 *   role: 'student' | 'tutor' | 'admin';  // User role
 *   jti: string;        // JWT ID for session tracking
 *   name?: string;      // Optional user name
 *   iat?: number;       // Issued at timestamp
 *   exp?: number;       // Expiration timestamp
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
 * // Use authResult.sub as user ID
 * const userId = authResult.sub;
 * ```
 */
export async function authorize(role: Role): Promise<AppJwtPayload | NextResponse> {
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

    // 5. 验证通过，返回用户信息
    return payload;

  } catch (error) {
    console.error('Authorization error:', error);
    return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
  }
}