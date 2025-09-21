import { NextResponse } from 'next/server';
import { 
  preWarmEmbeddingServers, 
  checkServerHealth,
  EMBEDDING_MODELS 
} from '@/lib/langChain/embedding';

// API endpoint to pre-warm embedding servers
export async function POST() {
  try {
    console.log('🔥 Starting embedding servers warm-up...');
    const startTime = Date.now();
    
    // Pre-warm both servers
    const warmupResult = await preWarmEmbeddingServers();
    
    // Check final health status
    const [e5Health, bgeHealth] = await Promise.allSettled([
      checkServerHealth(EMBEDDING_MODELS.e5.url),
      checkServerHealth(EMBEDDING_MODELS.bge.url)
    ]);
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      total_time_ms: Date.now() - startTime,
      warmup_results: warmupResult,
      health_status: {
        e5: e5Health.status === 'fulfilled' ? e5Health.value : { error: 'Health check failed' },
        bge: bgeHealth.status === 'fulfilled' ? bgeHealth.value : { error: 'Health check failed' }
      },
      servers: {
        e5: {
          url: EMBEDDING_MODELS.e5.url,
          model: EMBEDDING_MODELS.e5.model_name,
          dimensions: EMBEDDING_MODELS.e5.dimensions
        },
        bge: {
          url: EMBEDDING_MODELS.bge.url,
          model: EMBEDDING_MODELS.bge.model_name,
          dimensions: EMBEDDING_MODELS.bge.dimensions
        }
      }
    };
    
    console.log('✅ Embedding servers warm-up completed:', response);
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error('❌ Embedding servers warm-up failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  try {
    console.log('🔍 Checking embedding servers health...');
    
    const [e5Health, bgeHealth] = await Promise.allSettled([
      checkServerHealth(EMBEDDING_MODELS.e5.url),
      checkServerHealth(EMBEDDING_MODELS.bge.url)
    ]);
    
    const response = {
      timestamp: new Date().toISOString(),
      servers: {
        e5: {
          url: EMBEDDING_MODELS.e5.url,
          model: EMBEDDING_MODELS.e5.model_name,
          status: e5Health.status === 'fulfilled' ? e5Health.value : { error: 'Health check failed' }
        },
        bge: {
          url: EMBEDDING_MODELS.bge.url,
          model: EMBEDDING_MODELS.bge.model_name,
          status: bgeHealth.status === 'fulfilled' ? bgeHealth.value : { error: 'Health check failed' }
        }
      },
      overall_health: {
        both_healthy: e5Health.status === 'fulfilled' && bgeHealth.status === 'fulfilled' &&
          e5Health.value.isHealthy && bgeHealth.value.isHealthy,
        any_healthy: (e5Health.status === 'fulfilled' && e5Health.value.isHealthy) ||
          (bgeHealth.status === 'fulfilled' && bgeHealth.value.isHealthy)
      }
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
