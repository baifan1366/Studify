import { NextRequest, NextResponse } from 'next/server';
import { getAppStatus } from '@/lib/langChain/startup-optimizer';
import { getKeepAliveStatus } from '@/lib/langChain/server-keepalive';
import { getProcessorStatus } from '@/lib/langChain/embedding-processor';

// Comprehensive health status endpoint
export async function GET(request: NextRequest) {
  try {
    const [appStatus, keepAliveStatus, processorStatus] = await Promise.allSettled([
      getAppStatus(),
      getKeepAliveStatus(),
      getProcessorStatus()
    ]);

    const healthStatus = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NEXT_PUBLIC_NODE_ENV || 'development',
      services: {
        app: appStatus.status === 'fulfilled' ? appStatus.value : { error: 'Failed to get app status' },
        keepAlive: keepAliveStatus.status === 'fulfilled' ? keepAliveStatus.value : { error: 'Failed to get keep-alive status' },
        processor: processorStatus.status === 'fulfilled' ? processorStatus.value : { error: 'Failed to get processor status' }
      },
      overall: 'healthy'
    };

    // Determine overall health
    const hasErrors = [appStatus, keepAliveStatus, processorStatus].some(
      result => result.status === 'rejected'
    );

    if (hasErrors) {
      healthStatus.overall = 'degraded';
    }

    return NextResponse.json(healthStatus, {
      status: hasErrors ? 206 : 200,
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
