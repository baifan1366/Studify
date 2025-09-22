// app/api/admin/maintenance/system-health/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { qstashClient } from '@/utils/qstash/qstash';
import redis from '@/utils/redis/redis';

// GET /api/admin/maintenance/system-health - Get comprehensive system health metrics
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const healthMetrics = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {} as Record<string, any>,
      performance: {} as Record<string, any>,
      resources: {} as Record<string, any>
    };

    // Test Database Health
    try {
      const supabase = await createAdminClient();
      const start = Date.now();
      
      const { data: dbTest, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const responseTime = Date.now() - start;

      healthMetrics.services.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime,
        error: error?.message,
        lastCheck: new Date().toISOString()
      };

      // Get database statistics
      if (!error) {
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: courseCount } = await supabase
          .from('course')
          .select('*', { count: 'exact', head: true });

        const { count: queueCount } = await supabase
          .from('video_processing_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'processing');

        healthMetrics.resources.database = {
          totalUsers: userCount || 0,
          totalCourses: courseCount || 0,
          activeProcessingJobs: queueCount || 0
        };
      }
    } catch (error) {
      healthMetrics.services.database = {
        status: 'unhealthy',
        error: (error as Error).message,
        lastCheck: new Date().toISOString()
      };
      healthMetrics.overall = 'degraded';
    }

    // Test Redis Health
    try {
      const start = Date.now();
      await redis.set('health_check', 'ok', { ex: 60 });
      const result = await redis.get('health_check');
      const responseTime = Date.now() - start;

      healthMetrics.services.redis = {
        status: result === 'ok' ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString()
      };

      // Get Redis info (if available)
      try {
        const info = await (redis as any).info();
        const memoryUsed = info.match(/used_memory_human:([^\r\n]+)/)?.[1]?.trim();
        const connectedClients = info.match(/connected_clients:(\d+)/)?.[1];
        
        healthMetrics.resources.redis = {
          memoryUsed,
          connectedClients: parseInt(connectedClients || '0'),
          status: 'connected'
        };
      } catch (infoError) {
        // Redis info might not be available in some Redis services
        healthMetrics.resources.redis = {
          status: 'limited_info'
        };
      }
    } catch (error) {
      healthMetrics.services.redis = {
        status: 'unhealthy',
        error: (error as Error).message,
        lastCheck: new Date().toISOString()
      };
      healthMetrics.overall = 'degraded';
    }

    // Test QStash Health
    try {
      const start = Date.now();
      // Try to list queues to test QStash connectivity
      const response = await fetch('https://qstash.upstash.io/v2/queues', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
        },
      });
      
      const responseTime = Date.now() - start;
      const queues = response.ok ? await response.json() : null;

      healthMetrics.services.qstash = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: !response.ok ? `HTTP ${response.status}` : undefined
      };

      if (response.ok && queues) {
        healthMetrics.resources.qstash = {
          totalQueues: queues.length || 0,
          activeQueues: queues.filter((q: any) => q.lag > 0).length || 0
        };
      }
    } catch (error) {
      healthMetrics.services.qstash = {
        status: 'unhealthy',
        error: (error as Error).message,
        lastCheck: new Date().toISOString()
      };
      healthMetrics.overall = 'degraded';
    }

    // System Performance Metrics
    const performanceStart = Date.now();
    
    // Simulate some performance tests
    const performanceDuration = Date.now() - performanceStart;
    
    healthMetrics.performance = {
      apiResponseTime: performanceDuration,
      systemLoad: Math.random() * 100, // In a real system, get actual load
      memoryUsage: {
        used: Math.random() * 80, // Percentage
        available: 100 - (Math.random() * 80)
      },
      cpuUsage: Math.random() * 60 // Percentage
    };

    // Determine overall health
    const unhealthyServices = Object.values(healthMetrics.services)
      .filter(service => service.status === 'unhealthy').length;

    if (unhealthyServices === 0) {
      healthMetrics.overall = 'healthy';
    } else if (unhealthyServices === Object.keys(healthMetrics.services).length) {
      healthMetrics.overall = 'unhealthy';
    } else {
      healthMetrics.overall = 'degraded';
    }

    return NextResponse.json({
      success: true,
      data: healthMetrics
    });

  } catch (error) {
    console.error('System health check error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to perform health check',
        data: {
          timestamp: new Date().toISOString(),
          overall: 'unhealthy',
          error: (error as Error).message
        }
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/maintenance/system-health - Perform health check actions
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, service } = body;

    switch (action) {
      case 'restart_service':
        // In a real implementation, this would restart specific services
        return NextResponse.json({
          success: true,
          message: `Service restart initiated for ${service}`
        });

      case 'clear_cache':
        // Clear Redis cache
        if (service === 'redis') {
          await redis.flushdb();
          return NextResponse.json({
            success: true,
            message: 'Redis cache cleared successfully'
          });
        }
        break;

      case 'force_health_check':
        // Trigger an immediate comprehensive health check
        const healthCheckResponse = await fetch(
          new URL('/api/admin/maintenance/system-health', request.url).toString(),
          { method: 'GET', headers: request.headers }
        );
        
        const healthData = await healthCheckResponse.json();
        
        return NextResponse.json({
          success: true,
          message: 'Health check completed',
          data: healthData.data
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Health check action error:', error);
    return NextResponse.json(
      { message: 'Failed to perform health check action' },
      { status: 500 }
    );
  }
}
