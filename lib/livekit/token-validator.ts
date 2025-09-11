// lib/livekit/token-validator.ts
import { AccessToken } from 'livekit-server-sdk';
import redis from '@/utils/redis/redis';
import { createAdminClient } from '@/utils/supabase/server';

export interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  classroomId?: string;
  sessionId?: string;
  role?: 'host' | 'participant';
  error?: string;
}

export interface TokenSecurityOptions {
  maxTokensPerUser?: number;
  rateLimitWindow?: number; // 秒
  allowedOrigins?: string[];
  requireHttps?: boolean;
}

class LiveKitTokenValidator {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY!;
    this.apiSecret = process.env.LIVEKIT_API_SECRET!;

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('LiveKit credentials not configured');
    }
  }

  /**
   * 验证 LiveKit Token 的有效性
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // 使用 jose 库验证 JWT Token
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(this.apiSecret);
      
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      if (!payload) {
        return { isValid: false, error: 'Invalid token signature' };
      }

      // 检查 Token 是否过期
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { isValid: false, error: 'Token expired' };
      }

      // 解析 metadata
      let metadata: any = {};
      if (payload.metadata && typeof payload.metadata === 'string') {
        try {
          metadata = JSON.parse(payload.metadata);
        } catch {
          // metadata 解析失败，继续处理
        }
      }

      // 检查是否有房间管理权限
      const grants = payload.video as any;
      const isHost = grants?.roomAdmin === true;

      return {
        isValid: true,
        userId: metadata.userId,
        classroomId: metadata.classroomId,
        sessionId: metadata.sessionId,
        role: isHost ? 'host' : 'participant'
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return { isValid: false, error: 'Token validation failed' };
    }
  }

  /**
   * 检查用户 Token 生成频率限制
   */
  async checkRateLimit(userId: string, options: TokenSecurityOptions = {}): Promise<boolean> {
    const {
      maxTokensPerUser = 10,
      rateLimitWindow = 3600 // 1 小时
    } = options;

    const rateLimitKey = `token_rate_limit:${userId}`;
    
    try {
      const current = await redis.get(rateLimitKey);
      const count = current ? parseInt(current as string) : 0;

      if (count >= maxTokensPerUser) {
        return false; // 超出限制
      }

      // 增加计数
      await redis.set(rateLimitKey, count + 1, { ex: rateLimitWindow });
      return true;

    } catch (error) {
      console.error('Rate limit check error:', error);
      return true; // 出错时允许通过
    }
  }

  /**
   * 验证请求来源安全性
   */
  validateRequestSecurity(
    request: Request,
    options: TokenSecurityOptions = {}
  ): { isValid: boolean; error?: string } {
    const {
      allowedOrigins = [],
      requireHttps = process.env.NEXT_PUBLIC_NODE_ENV === 'production'
    } = options;

    // 检查 HTTPS
    if (requireHttps) {
      const protocol = request.headers.get('x-forwarded-proto') || 
                     new URL(request.url).protocol;
      if (protocol !== 'https:') {
        return { isValid: false, error: 'HTTPS required' };
      }
    }

    // 检查 Origin
    if (allowedOrigins.length > 0) {
      const origin = request.headers.get('origin');
      if (!origin || !allowedOrigins.includes(origin)) {
        return { isValid: false, error: 'Invalid origin' };
      }
    }

    // 检查 User-Agent（防止直接 API 调用）
    const userAgent = request.headers.get('user-agent');
    if (!userAgent || userAgent.includes('curl') || userAgent.includes('wget')) {
      return { isValid: false, error: 'Invalid user agent' };
    }

    return { isValid: true };
  }

  /**
   * 撤销用户的所有 Token
   */
  async revokeUserTokens(userId: string, sessionId?: string): Promise<void> {
    try {
      // 清除 Redis 中的缓存 Token
      const pattern = sessionId ? 
        `livekit_token:${sessionId}:${userId}` : 
        `livekit_token:*:${userId}`;
      
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // 记录撤销日志
      const logKey = `token_revocation:${userId}:${Date.now()}`;
      await redis.set(logKey, JSON.stringify({
        userId,
        sessionId,
        revokedAt: new Date().toISOString(),
        reason: 'manual_revocation'
      }), { ex: 86400 }); // 保留 24 小时

    } catch (error) {
      console.error('Token revocation error:', error);
      throw error;
    }
  }

  /**
   * 清理过期的 Token 缓存
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const pattern = 'livekit_token:*';
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        const token = await redis.get(key);
        if (token) {
          const validation = await this.validateToken(token as string);
          if (!validation.isValid) {
            await redis.del(key);
          }
        }
      }
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }

  /**
   * 获取 Token 使用统计
   */
  async getTokenStats(timeRange: number = 3600): Promise<any> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - timeRange;

      // 这里可以实现更复杂的统计逻辑
      // 例如从 Redis 或数据库中获取 Token 生成和使用情况

      return {
        totalTokensGenerated: 0,
        activeTokens: 0,
        revokedTokens: 0,
        timeRange,
        timestamp: now
      };
    } catch (error) {
      console.error('Token stats error:', error);
      return null;
    }
  }
}

// 单例模式
export const liveKitTokenValidator = new LiveKitTokenValidator();
