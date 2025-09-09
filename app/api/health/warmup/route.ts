import { NextRequest, NextResponse } from 'next/server';
import { performSystemWarmup, getWarmupStatus } from '@/lib/langChain/warmup-system';

// Warmup endpoint for external services to trigger
export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('User-Agent') || '';
    console.log(`Warmup request from: ${userAgent}`);

    // Perform warmup
    await performSystemWarmup();
    
    const status = getWarmupStatus();
    
    return NextResponse.json({
      message: 'System warmup completed',
      timestamp: new Date().toISOString(),
      status
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Warmup error:', error);
    
    return NextResponse.json({
      message: 'Warmup failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Support POST for webhook triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
