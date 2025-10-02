import { NextRequest, NextResponse } from 'next/server';
import { getAppStatus } from '@/lib/langChain/startup-optimizer';
import { getKeepAliveStatus } from '@/lib/langChain/server-keepalive';
import { getProcessorStatus } from '@/lib/langChain/embedding-processor';
import { checkConnection } from '@/lib/supabase-realtime';

/**
 * Comprehensive Health Status API
 * GET /api/health/status
 * 
 * 检查所有服务的健康状态，包括：
 * - App 状态
 * - Keep-alive 状态
 * - Embedding processor 状态
 * - Supabase 连接状态
 */
export async function GET(request: NextRequest) {
  try {
    const [appStatus, keepAliveStatus, processorStatus, supabaseHealth] = await Promise.allSettled([
      getAppStatus(),
      getKeepAliveStatus(),
      getProcessorStatus(),
      checkConnection()
    ]);

    const healthStatus = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NEXT_PUBLIC_NODE_ENV || 'development',
      services: {
        app: appStatus.status === 'fulfilled' ? appStatus.value : { error: 'Failed to get app status' },
        keepAlive: keepAliveStatus.status === 'fulfilled' ? keepAliveStatus.value : { error: 'Failed to get keep-alive status' },
        processor: processorStatus.status === 'fulfilled' ? processorStatus.value : { error: 'Failed to get processor status' },
        supabase: supabaseHealth.status === 'fulfilled' 
          ? {
              healthy: supabaseHealth.value.healthy,
              timestamp: supabaseHealth.value.timestamp,
              error: supabaseHealth.value.error
            }
          : { 
              healthy: false,
              error: 'Failed to check Supabase connection' 
            }
      },
      overall: 'healthy'
    };

    // Determine overall health
    const hasErrors = [appStatus, keepAliveStatus, processorStatus].some(
      result => result.status === 'rejected'
    );
    
    const supabaseUnhealthy = supabaseHealth.status === 'fulfilled' 
      ? !supabaseHealth.value.healthy 
      : true;

    if (hasErrors || supabaseUnhealthy) {
      healthStatus.overall = 'degraded';
    }

    return NextResponse.json(healthStatus, {
      status: (hasErrors || supabaseUnhealthy) ? 206 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health status error:', error);
    
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: 'unhealthy',
        error: 'Health check failed',
        uptime: process.uptime()
      },
      { status: 500 }
    );
  }
}
