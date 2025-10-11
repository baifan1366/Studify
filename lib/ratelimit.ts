/**
 * Rate Limiting Utility
 * 
 * Provides simple in-memory rate limiting for API endpoints
 * For production, consider using Redis-based solutions like Upstash
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   * @param identifier Unique identifier (e.g., user ID, IP address)
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit: number;
  } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // If no entry or entry expired, create new one
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs
      };
      this.limits.set(identifier, newEntry);
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime,
        limit: this.maxRequests
      };
    }

    // Entry exists and not expired
    if (entry.count < this.maxRequests) {
      entry.count++;
      this.limits.set(identifier, entry);
      
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime,
        limit: this.maxRequests
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: this.maxRequests
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Rate limiter cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Reset limit for a specific identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Get current stats
   */
  getStats(): {
    totalTracked: number;
    windowMs: number;
    maxRequests: number;
  } {
    return {
      totalTracked: this.limits.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

// Global rate limiters for different endpoints
const rateLimiters = {
  // AI endpoints - 10 requests per minute per user
  ai: new RateLimiter(60000, 10),
  
  // Video QA - 20 requests per minute per user
  videoQA: new RateLimiter(60000, 20),
  
  // Streaming - 5 requests per minute per user
  stream: new RateLimiter(60000, 5),
  
  // General API - 30 requests per minute per user
  general: new RateLimiter(60000, 30),
};

/**
 * Get rate limiter for a specific endpoint type
 */
export function getRateLimiter(type: 'ai' | 'videoQA' | 'stream' | 'general' = 'general'): RateLimiter {
  return rateLimiters[type];
}

/**
 * Middleware helper for Next.js API routes
 */
export function createRateLimitCheck(type: 'ai' | 'videoQA' | 'stream' | 'general' = 'general') {
  return (identifier: string) => {
    const limiter = getRateLimiter(type);
    return limiter.check(identifier);
  };
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(resetTime: number, limit: number) {
  return {
    error: 'Too many requests',
    message: `Rate limit exceeded. Please try again later.`,
    retryAfter: Math.ceil((resetTime - Date.now()) / 1000), // seconds
    limit,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString(),
      'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
    }
  };
}

/**
 * Example usage in API route:
 * 
 * ```typescript
 * import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';
 * 
 * export async function POST(request: NextRequest) {
 *   const userId = getUserId(request);
 *   const checkLimit = createRateLimitCheck('ai');
 *   const { allowed, remaining, resetTime, limit } = checkLimit(userId);
 *   
 *   if (!allowed) {
 *     return NextResponse.json(
 *       rateLimitResponse(resetTime, limit),
 *       { 
 *         status: 429,
 *         headers: rateLimitResponse(resetTime, limit).headers
 *       }
 *     );
 *   }
 *   
 *   // Process request...
 *   
 *   return NextResponse.json(result, {
 *     headers: {
 *       'X-RateLimit-Limit': limit.toString(),
 *       'X-RateLimit-Remaining': remaining.toString(),
 *       'X-RateLimit-Reset': resetTime.toString()
 *     }
 *   });
 * }
 * ```
 */
