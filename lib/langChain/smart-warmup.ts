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
      
      // Create AbortController for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds for cold starts
      
      const response = await fetch(`${embeddingServerUrl}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Studify-Warmup/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.embeddingServerWarmedUp = true;
        const warmupTime = Date.now() - startTime;
        console.log(`✅ Embedding server warmed up successfully in ${warmupTime}ms`);
      } else {
        console.warn(`⚠️ Embedding server warmup failed with status: ${response.status}`);
        // Still mark as warmed up to avoid repeated attempts
        this.embeddingServerWarmedUp = true;
      }
    } catch (error) {
      const warmupTime = Date.now() - startTime;
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`❌ Embedding server warmup timeout after ${warmupTime}ms - server may be cold starting`);
        } else {
          console.error(`❌ Embedding server warmup error after ${warmupTime}ms:`, error.message);
        }
      } else {
        console.error(`❌ Embedding server warmup unknown error after ${warmupTime}ms:`, error);
      }
      
      // Mark as warmed up to prevent repeated failed attempts
      this.embeddingServerWarmedUp = true;
      
      // Don't throw - let the actual request handle the cold start
    } finally {
      // Reset the warmup promise so future requests can try again if needed
      this.warmupPromise = null;
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
