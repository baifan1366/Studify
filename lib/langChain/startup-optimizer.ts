import { getVectorStore } from './vectorstore';
import { getEmbeddingProcessor } from './embedding-processor';
import { startKeepAlive } from './server-keepalive';

// Startup optimization to reduce cold start time
export class StartupOptimizer {
  private static instance: StartupOptimizer | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private criticalServices: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): StartupOptimizer {
    if (!StartupOptimizer.instance) {
      StartupOptimizer.instance = new StartupOptimizer();
    }
    return StartupOptimizer.instance;
  }

  // Fast initialization - only critical services
  async fastInit(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performFastInit();
    await this.initPromise;
  }

  private async performFastInit(): Promise<void> {
    console.log('Starting fast initialization...');
    const startTime = Date.now();

    try {
      // Initialize only critical services in parallel
      const criticalTasks = [
        this.initDatabase(),
        this.initKeepAlive(),
        this.preloadEssentialModules()
      ];

      await Promise.allSettled(criticalTasks);
      
      // Mark as initialized
      this.isInitialized = true;
      const initTime = Date.now() - startTime;
      console.log(`Fast initialization completed in ${initTime}ms`);

      // Start background initialization for non-critical services
      this.backgroundInit();
    } catch (error) {
      console.error('Fast initialization failed:', error);
      throw error;
    }
  }

  // Initialize database connection (lazy)
  private async initDatabase(): Promise<void> {
    try {
      // Just verify connection, don't load heavy operations
      const vectorStore = getVectorStore();
      await vectorStore.getQueueStatus(); // Lightweight check
      this.criticalServices.set('database', true);
      console.log('Database connection verified');
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.criticalServices.set('database', false);
    }
  }

  // Initialize keep-alive system
  private async initKeepAlive(): Promise<void> {
    try {
      // Only start keep-alive in production
      if (process.env.NODE_ENV === 'production') {
        startKeepAlive();
        this.criticalServices.set('keepalive', true);
        console.log('Keep-alive system started');
      } else {
        this.criticalServices.set('keepalive', true);
        console.log('Keep-alive skipped in development');
      }
    } catch (error) {
      console.error('Keep-alive initialization failed:', error);
      this.criticalServices.set('keepalive', false);
    }
  }

  // Preload essential modules
  private async preloadEssentialModules(): Promise<void> {
    try {
      // Preload commonly used modules to avoid import delays
      const modulePromises = [
        import('@supabase/supabase-js'),
        import('next/server'),
        // Don't preload heavy AI modules - load them lazily
      ];

      await Promise.allSettled(modulePromises);
      this.criticalServices.set('modules', true);
      console.log('Essential modules preloaded');
    } catch (error) {
      console.error('Module preloading failed:', error);
      this.criticalServices.set('modules', false);
    }
  }

  // Background initialization for non-critical services
  private backgroundInit(): void {
    // Use setTimeout to avoid blocking the main thread
    setTimeout(async () => {
      console.log('Starting background initialization...');
      
      try {
        // Initialize embedding processor only if there are items in queue
        const vectorStore = getVectorStore();
        const queueStatus = await vectorStore.getQueueStatus();
        
        if (queueStatus.queued > 0) {
          console.log(`Found ${queueStatus.queued} items in embedding queue, starting processor...`);
          const processor = getEmbeddingProcessor();
          processor.start();
        } else {
          console.log('No items in embedding queue, processor will start on demand');
        }
      } catch (error) {
        console.error('Background initialization failed:', error);
      }
    }, 1000); // 1 second delay
  }

  // Lazy initialization for heavy services
  async initEmbeddingProcessor(): Promise<void> {
    try {
      const processor = getEmbeddingProcessor();
      if (!processor.getStatus().isRunning) {
        processor.start();
        console.log('Embedding processor started on demand');
      }
    } catch (error) {
      console.error('Failed to start embedding processor:', error);
    }
  }

  // Check if service is ready
  isServiceReady(serviceName: string): boolean {
    return this.criticalServices.get(serviceName) === true;
  }

  // Get initialization status
  getStatus(): {
    isInitialized: boolean;
    services: Record<string, boolean>;
    readyServices: number;
    totalServices: number;
  } {
    const services = Object.fromEntries(this.criticalServices);
    const readyServices = Array.from(this.criticalServices.values()).filter(Boolean).length;
    
    return {
      isInitialized: this.isInitialized,
      services,
      readyServices,
      totalServices: this.criticalServices.size
    };
  }
}

// Cache for expensive operations
export class StartupCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  // Get cached data
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // Set cached data
  static set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  // Clear cache
  static clear(): void {
    this.cache.clear();
  }

  // Get cache stats
  static getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Utility functions
export async function initializeApp(): Promise<void> {
  const optimizer = StartupOptimizer.getInstance();
  await optimizer.fastInit();
}

export async function ensureEmbeddingProcessor(): Promise<void> {
  const optimizer = StartupOptimizer.getInstance();
  await optimizer.initEmbeddingProcessor();
}

export function getAppStatus() {
  const optimizer = StartupOptimizer.getInstance();
  return {
    startup: optimizer.getStatus(),
    cache: StartupCache.getStats()
  };
}
