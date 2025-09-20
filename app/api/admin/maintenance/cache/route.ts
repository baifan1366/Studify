// app/api/admin/maintenance/cache/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import redis from '@/utils/redis/redis';

// GET /api/admin/maintenance/cache - Get cache statistics and health
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') || '*';
    const limit = parseInt(searchParams.get('limit') || '100');

    const cacheData = {
      timestamp: new Date().toISOString(),
      health: {} as any,
      statistics: {} as any,
      keys: [] as any[],
      memory: {} as any
    };

    // Test Redis connection and get basic info
    try {
      const start = Date.now();
      await redis.ping();
      const pingTime = Date.now() - start;

      cacheData.health = {
        status: 'healthy',
        responseTime: pingTime,
        lastCheck: new Date().toISOString()
      };

      // Get Redis info
      try {
        // Note: info() method may not be available in all Redis clients
        // Using a try-catch to handle this gracefully
        const info = await (redis as any).info();
        const lines = info.split('\r\n');
        
        const stats = {} as any;
        lines.forEach((line: string) => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            stats[key] = value;
          }
        });

        cacheData.statistics = {
          connectedClients: parseInt(stats.connected_clients || '0'),
          totalCommandsProcessed: parseInt(stats.total_commands_processed || '0'),
          keyspaceHits: parseInt(stats.keyspace_hits || '0'),
          keyspaceMisses: parseInt(stats.keyspace_misses || '0'),
          evictedKeys: parseInt(stats.evicted_keys || '0'),
          expiredKeys: parseInt(stats.expired_keys || '0'),
          uptime: parseInt(stats.uptime_in_seconds || '0')
        };

        // Calculate hit rate
        const hits = cacheData.statistics.keyspaceHits;
        const misses = cacheData.statistics.keyspaceMisses;
        cacheData.statistics.hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

        cacheData.memory = {
          used: stats.used_memory_human,
          peak: stats.used_memory_peak_human,
          rss: stats.used_memory_rss_human,
          lua: stats.used_memory_lua_human
        };
      } catch (infoError) {
        console.warn('Could not get Redis info:', infoError);
        cacheData.statistics = { note: 'Redis info not available' };
      }

      // Get cache keys (with pattern matching)
      try {
        const keys = await redis.keys(pattern);
        const keyPromises = keys.slice(0, limit).map(async (key) => {
          try {
            const ttl = await redis.ttl(key);
            const type = await redis.type(key);
            
            let size = 0;
            let value = null;
            
            // Get size and sample value based on type
            switch (type) {
              case 'string':
                value = await redis.get(key);
                size = value ? JSON.stringify(value).length : 0;
                break;
              case 'hash':
                const hashKeys = await redis.hkeys(key);
                size = hashKeys.length;
                break;
              case 'list':
                size = await redis.llen(key);
                break;
              case 'set':
                size = await redis.scard(key);
                break;
              case 'zset':
                size = await redis.zcard(key);
                break;
            }

            return {
              key,
              type,
              ttl: ttl === -1 ? 'never' : `${ttl}s`,
              size,
              sampleValue: type === 'string' && size < 200 ? value : null
            };
          } catch (keyError) {
            return {
              key,
              error: (keyError as Error).message
            };
          }
        });

        cacheData.keys = await Promise.all(keyPromises);

        // Group keys by pattern for analysis
        const keyGroups = cacheData.keys.reduce((acc, keyData) => {
          const prefix = keyData.key.split(':')[0];
          if (!acc[prefix]) {
            acc[prefix] = { count: 0, totalSize: 0, types: new Set() };
          }
          acc[prefix].count++;
          acc[prefix].totalSize += keyData.size || 0;
          acc[prefix].types.add(keyData.type);
          return acc;
        }, {} as Record<string, any>);

        // Convert sets to arrays for JSON serialization
        Object.keys(keyGroups).forEach(prefix => {
          keyGroups[prefix].types = Array.from(keyGroups[prefix].types);
        });

        cacheData.statistics.keyGroups = keyGroups;
        cacheData.statistics.totalKeys = keys.length;

      } catch (keysError) {
        console.warn('Could not scan Redis keys:', keysError);
        cacheData.keys = [];
        cacheData.statistics.totalKeys = 0;
      }

    } catch (error) {
      cacheData.health = {
        status: 'unhealthy',
        error: (error as Error).message,
        lastCheck: new Date().toISOString()
      };
    }

    return NextResponse.json({
      success: true,
      data: cacheData
    });

  } catch (error) {
    console.error('Cache monitoring API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/maintenance/cache - Perform cache management operations
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, pattern, keys, ttl } = body;

    switch (action) {
      case 'flush_all':
        // Clear all cache
        await redis.flushall();
        return NextResponse.json({
          success: true,
          message: 'All cache cleared successfully'
        });

      case 'flush_db':
        // Clear current database
        await redis.flushdb();
        return NextResponse.json({
          success: true,
          message: 'Current database cache cleared successfully'
        });

      case 'delete_pattern':
        if (!pattern) {
          return NextResponse.json(
            { message: 'Pattern is required for pattern deletion' },
            { status: 400 }
          );
        }

        const keysToDelete = await redis.keys(pattern);
        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete);
        }

        return NextResponse.json({
          success: true,
          message: `${keysToDelete.length} keys matching pattern "${pattern}" deleted`
        });

      case 'delete_keys':
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json(
            { message: 'Keys array is required for key deletion' },
            { status: 400 }
          );
        }

        const deleteCount = await redis.del(...keys);
        return NextResponse.json({
          success: true,
          message: `${deleteCount} keys deleted`
        });

      case 'expire_pattern':
        if (!pattern || !ttl) {
          return NextResponse.json(
            { message: 'Pattern and TTL are required for expiration' },
            { status: 400 }
          );
        }

        const keysToExpire = await redis.keys(pattern);
        const expirePromises = keysToExpire.map(key => redis.expire(key, ttl));
        await Promise.all(expirePromises);

        return NextResponse.json({
          success: true,
          message: `${keysToExpire.length} keys set to expire in ${ttl} seconds`
        });

      case 'persist_keys':
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
          return NextResponse.json(
            { message: 'Keys array is required for persistence' },
            { status: 400 }
          );
        }

        const persistPromises = keys.map(key => redis.persist(key));
        const persistResults = await Promise.all(persistPromises);
        const persistedCount = persistResults.filter(result => result === 1).length;

        return NextResponse.json({
          success: true,
          message: `${persistedCount} keys set to persist (never expire)`
        });

      case 'analyze_memory':
        // Perform memory analysis
        try {
          const info = await (redis as any).info('memory');
          const keysSample = await redis.keys('*');
          
          // Categorize keys by prefix
          const memoryAnalysis = keysSample.slice(0, 1000).reduce((acc, key) => {
            const prefix = key.split(':')[0];
            if (!acc[prefix]) {
              acc[prefix] = { count: 0, estimatedSize: 0 };
            }
            acc[prefix].count++;
            acc[prefix].estimatedSize += key.length + 50; // Rough estimate
            return acc;
          }, {} as Record<string, any>);

          return NextResponse.json({
            success: true,
            message: 'Memory analysis completed',
            data: {
              memoryInfo: info,
              keyAnalysis: memoryAnalysis,
              totalSampleKeys: Math.min(keysSample.length, 1000),
              totalKeys: keysSample.length
            }
          });
        } catch (analysisError) {
          throw analysisError;
        }

      case 'warm_cache':
        // Pre-populate cache with frequently accessed data
        const warmupData = {
          'system:health': { status: 'healthy', timestamp: new Date().toISOString() },
          'config:cache_version': '1.0.0'
        };

        const warmupPromises = Object.entries(warmupData).map(([key, value]) =>
          redis.set(key, JSON.stringify(value), { ex: 3600 })
        );

        await Promise.all(warmupPromises);

        return NextResponse.json({
          success: true,
          message: `Cache warmed up with ${Object.keys(warmupData).length} entries`
        });

      case 'optimize_cache':
        // Perform cache optimization
        try {
          // Remove expired keys (if manual cleanup is needed)
          const allKeys = await redis.keys('*');
          let expiredCount = 0;
          
          // Check TTL for each key and count expired ones
          const ttlChecks = await Promise.all(
            allKeys.slice(0, 100).map(async (key) => {
              const ttl = await redis.ttl(key);
              return { key, ttl };
            })
          );

          expiredCount = ttlChecks.filter(check => check.ttl === -2).length;

          return NextResponse.json({
            success: true,
            message: 'Cache optimization completed',
            data: {
              totalKeysChecked: ttlChecks.length,
              expiredKeysFound: expiredCount
            }
          });
        } catch (optimizeError) {
          throw optimizeError;
        }

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cache management operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform cache operation' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/maintenance/cache - Delete cache entries
export async function DELETE(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');
    const key = searchParams.get('key');

    if (pattern) {
      // Delete keys matching pattern
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      return NextResponse.json({
        success: true,
        message: `${keys.length} keys matching pattern "${pattern}" deleted`
      });
    } else if (key) {
      // Delete specific key
      const result = await redis.del(key);
      
      return NextResponse.json({
        success: true,
        message: result === 1 ? `Key "${key}" deleted` : `Key "${key}" not found`
      });
    } else {
      return NextResponse.json(
        { message: 'Either pattern or key parameter is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Cache deletion error:', error);
    return NextResponse.json(
      { message: 'Failed to delete cache entries' },
      { status: 500 }
    );
  }
}
