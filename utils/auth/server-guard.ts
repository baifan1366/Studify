// utils/auth/server-guard.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAppJwt, AppJwtPayload } from './jwt';
import redis from '../redis/redis';

type Role = 'student' | 'tutor' | 'admin';

/**
 * Authorizes a request for a specific role in an App Router API Route.
 * @param role The required role ('student', 'tutor', or 'admin').
 * @returns A promise that resolves to the user payload if authorized, 
 *          or a NextResponse object if unauthorized.
 */
export async function authorize(role: Role): Promise<AppJwtPayload | NextResponse> {
  try {
    // 1. 读取 Cookie 里的 App JWT
    const cookieStore = await cookies();
    const token = cookieStore.get('app_jwt')?.value;

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