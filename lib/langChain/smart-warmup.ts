import { NextRequest } from 'next/server';

// Smart warmup system - only warms up embedding server when needed
export class SmartWarmup {
  private static instance: SmartWarmup | null = null;
  private embeddingServerWarmedUp = false;
  private warmupPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): SmartWarmup {
    if (!SmartWarmup.instance) {
      SmartWarmup.instance = new SmartWarmup();
    }
    return SmartWarmup.instance;
  }

  // Check if request needs embedding server
  needsEmbeddingServer(request: NextRequest): boolean {
    const { pathname } = request.nextUrl;
    
    // Only these endpoints need embedding server warmup
    const embeddingEndpoints = [
      '/api/embeddings/search',     // Semantic search - MAIN USER INTERACTION
      '/api/embeddings/processor',  // Background processor
      '/api/embeddings/queue'       // Manual queuing
    ];

    return embeddingEndpoints.some(endpoint => pathname.includes(endpoint));
  }

  // Warm up embedding server only when needed
  async warmupEmbeddingServer(): Promise<void> {
    if (this.embeddingServerWarmedUp) return;
    if (this.warmupPromise) return this.warmupPromise;

    this.warmupPromise = this.performEmbeddingWarmup();
    await this.warmupPromise;
  }

  private async performEmbeddingWarmup(): Promise<void> {
    console.log('Warming up embedding server...');
    const startTime = Date.now();

    try {
      // Ping embedding server to wake it up
      const embeddingServerUrl = "https://embedding-server-jxsa.onrender.com";
      
      const response = await fetch(`${embeddingServerUrl}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Studify-Warmup/1.0'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      if (response.ok) {
        this.embeddingServerWarmedUp = true;
        const warmupTime = Date.now() - startTime;
        console.log(`Embedding server warmed up in ${warmupTime}ms`);
      } else {
        console.warn(`Embedding server warmup failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Embedding server warmup error:', error);
      // Don't throw - let the actual request handle the cold start
    }
  }

  // Get warmup status
  getStatus(): {
    embeddingServerWarmedUp: boolean;
  } {
    return {
      embeddingServerWarmedUp: this.embeddingServerWarmedUp
    };
  }

  // Reset warmup status (for testing)
  reset(): void {
    this.embeddingServerWarmedUp = false;
    this.warmupPromise = null;
  }
}

// Middleware function for smart warmup
export async function smartWarmupMiddleware(request: NextRequest): Promise<void> {
  const smartWarmup = SmartWarmup.getInstance();
  
  // Only warmup if this request needs embedding server
  if (smartWarmup.needsEmbeddingServer(request)) {
    // Start warmup in background (don't block the request)
    smartWarmup.warmupEmbeddingServer().catch(error => {
      console.error('Smart warmup failed:', error);
    });
  }
}

// Utility functions
export function needsEmbeddingWarmup(pathname: string): boolean {
  const smartWarmup = SmartWarmup.getInstance();
  return smartWarmup.needsEmbeddingServer({ nextUrl: { pathname } } as NextRequest);
}

export async function warmupEmbeddingServerIfNeeded(pathname: string): Promise<void> {
  if (needsEmbeddingWarmup(pathname)) {
    const smartWarmup = SmartWarmup.getInstance();
    await smartWarmup.warmupEmbeddingServer();
  }
}

export function getSmartWarmupStatus() {
  const smartWarmup = SmartWarmup.getInstance();
  return smartWarmup.getStatus();
}
