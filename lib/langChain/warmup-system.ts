import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from './startup-optimizer';
import { getVectorStore } from './vectorstore';

// Intelligent warmup system for faster cold starts
export class WarmupSystem {
  private static instance: WarmupSystem | null = null;
  private warmupCache = new Map<string, any>();
  private isWarmedUp = false;

  private constructor() {}

  static getInstance(): WarmupSystem {
    if (!WarmupSystem.instance) {
      WarmupSystem.instance = new WarmupSystem();
    }
    return WarmupSystem.instance;
  }

  // Perform intelligent warmup
  async performWarmup(): Promise<void> {
    if (this.isWarmedUp) return;

    console.log('Starting intelligent warmup...');
    const startTime = Date.now();

    try {
      // Parallel warmup tasks
      await Promise.allSettled([
        this.warmupDatabase(),
        this.warmupEmbeddingSystem(),
        this.preloadCommonQueries(),
        this.warmupMemoryCache()
      ]);

      this.isWarmedUp = true;
      const warmupTime = Date.now() - startTime;
      console.log(`Warmup completed in ${warmupTime}ms`);
    } catch (error) {
      console.error('Warmup failed:', error);
    }
  }

  // Warmup database connections
  private async warmupDatabase(): Promise<void> {
    try {
      const vectorStore = getVectorStore();
      
      // Perform lightweight database operations to establish connections
      const [queueStatus, embeddingStats] = await Promise.all([
        vectorStore.getQueueStatus(),
        vectorStore.getEmbeddingStats()
      ]);

      this.warmupCache.set('queue_status', queueStatus);
      this.warmupCache.set('embedding_stats', embeddingStats);
      
      console.log('Database warmup completed');
    } catch (error) {
      console.error('Database warmup failed:', error);
    }
  }

  // Warmup embedding system
  private async warmupEmbeddingSystem(): Promise<void> {
    try {
      // Initialize but don't start processor unless needed
      await initializeApp();
      console.log('Embedding system warmup completed');
    } catch (error) {
      console.error('Embedding system warmup failed:', error);
    }
  }

  // Preload common search queries
  private async preloadCommonQueries(): Promise<void> {
    try {
      const vectorStore = getVectorStore();
      
      // Cache common search patterns (without actual embedding generation)
      const commonQueries = [
        'javascript tutorial',
        'react components',
        'database design',
        'api development'
      ];

      // Just prepare the search infrastructure, don't actually search
      this.warmupCache.set('common_queries', commonQueries);
      console.log('Common queries preloaded');
    } catch (error) {
      console.error('Query preloading failed:', error);
    }
  }

  // Warmup memory cache
  private async warmupMemoryCache(): Promise<void> {
    try {
      // Pre-allocate some memory structures
      const memoryStructures = {
        searchCache: new Map(),
        embeddingCache: new Map(),
        queryCache: new Map()
      };

      this.warmupCache.set('memory_structures', memoryStructures);
      console.log('Memory cache warmup completed');
    } catch (error) {
      console.error('Memory cache warmup failed:', error);
    }
  }

  // Get cached data from warmup
  getCachedData(key: string): any {
    return this.warmupCache.get(key);
  }

  // Check if system is warmed up
  isSystemWarmedUp(): boolean {
    return this.isWarmedUp;
  }

  // Get warmup status
  getWarmupStatus(): {
    isWarmedUp: boolean;
    cacheSize: number;
    cachedKeys: string[];
  } {
    return {
      isWarmedUp: this.isWarmedUp,
      cacheSize: this.warmupCache.size,
      cachedKeys: Array.from(this.warmupCache.keys())
    };
  }
}

// Middleware for automatic warmup
export async function warmupMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const warmup = WarmupSystem.getInstance();
  
  // Check if this is the first request after cold start
  if (!warmup.isSystemWarmedUp()) {
    // Start warmup in background (don't block the request)
    warmup.performWarmup().catch(error => {
      console.error('Background warmup failed:', error);
    });
  }

  return null; // Continue with normal request processing
}

// Smart caching for embedding operations
export class EmbeddingCache {
  private static cache = new Map<string, {
    embedding: number[];
    timestamp: number;
    hits: number;
  }>();
  
  private static readonly MAX_CACHE_SIZE = 1000;
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Get cached embedding
  static get(text: string): number[] | null {
    const key = this.generateKey(text);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count
    cached.hits++;
    return cached.embedding;
  }

  // Set cached embedding
  static set(text: string, embedding: number[]): void {
    const key = this.generateKey(text);
    
    // Clean cache if too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup();
    }
    
    this.cache.set(key, {
      embedding: [...embedding], // Clone array
      timestamp: Date.now(),
      hits: 1
    });
  }

  // Generate cache key
  private static generateKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Cleanup old entries
  private static cleanup(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by hits (ascending) and timestamp (ascending)
    entries.sort((a, b) => {
      if (a[1].hits !== b[1].hits) {
        return a[1].hits - b[1].hits;
      }
      return a[1].timestamp - b[1].timestamp;
    });
    
    // Remove least used entries
    const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2); // Remove 20%
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`Cleaned up ${toRemove} cache entries`);
  }

  // Get cache statistics
  static getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    avgHits: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      totalHits,
      avgHits: entries.length > 0 ? totalHits / entries.length : 0
    };
  }

  // Clear cache
  static clear(): void {
    this.cache.clear();
  }
}

// Utility functions
export async function performSystemWarmup(): Promise<void> {
  const warmup = WarmupSystem.getInstance();
  await warmup.performWarmup();
}

export function getWarmupStatus() {
  const warmup = WarmupSystem.getInstance();
  return warmup.getWarmupStatus();
}

export function getCachedEmbedding(text: string): number[] | null {
  return EmbeddingCache.get(text);
}

export function setCachedEmbedding(text: string, embedding: number[]): void {
  EmbeddingCache.set(text, embedding);
}

export function getEmbeddingCacheStats() {
  return EmbeddingCache.getStats();
}
