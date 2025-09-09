import { NextRequest, NextResponse } from 'next/server';

// Health check endpoint for keep-alive pings
export async function GET(request: NextRequest) {
  try {
    const isKeepAlive = request.headers.get('X-Keep-Alive') === 'true';
    const userAgent = request.headers.get('User-Agent') || '';
    
    // Log keep-alive pings for monitoring
    if (isKeepAlive || userAgent.includes('KeepAlive') || userAgent.includes('Monitor')) {
      console.log(`Keep-alive ping received from: ${userAgent}`);
    }

    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}

// Support POST for some monitoring services
export async function POST(request: NextRequest) {
  return GET(request);
}
