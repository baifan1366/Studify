import { NextRequest, NextResponse } from 'next/server';
import { preWarmEmbeddingServers } from '@/lib/langChain/embedding';

export async function POST(req: NextRequest) {
  try {
    console.log('🔥 Manual embedding server warmup requested');
    
    const result = await preWarmEmbeddingServers();
    
    return NextResponse.json({
      success: true,
      message: 'Embedding servers warmed up successfully',
      results: result
    });
  } catch (error) {
    console.error('❌ Warmup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to warm up embedding servers',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to warm up embedding servers',
    endpoints: [
      'https://edusocial-e5-small-embedding-server.hf.space',
      'https://edusocial-bge-m3-embedding-server.hf.space'
    ]
  });
}
