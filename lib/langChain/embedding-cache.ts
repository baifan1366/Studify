import { createHash } from 'crypto';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  ttl: number;
}

// Cache statistics interface
interface CacheStats {
  size: number;
  maxSize: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

// Multi-level cache system for embeddings
export class EmbeddingCache {
  private embeddingCache = new Map<string, CacheEntry<number[]>>();
  private searchResultCache = new Map<string, CacheEntry<any>>();
  private queryCache = new Map<string, CacheEntry<number[]>>();
  
  private readonly maxEmbeddingCacheSize = 1000;
  private readonly maxSearchCacheSize = 500;
  private readonly maxQueryCacheSize = 200;
  
  private readonly embeddingTTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly searchTTL = 30 * 60 * 1000; // 30 minutes
  private readonly queryTTL = 60 * 60 * 1000; // 1 hour
  
  private totalHits = 0;
  private totalMisses = 0;

  // Generate cache key from text
  private generateKey(text: string): string {
    return createHash('md5').update(text.trim().toLowerCase()).digest('hex');
  }

  // Generate search cache key
  private generateSearchKey(query: string, options: any): string {
    const searchParams = {
      query: query.trim().toLowerCase(),
      contentTypes: options.contentTypes?.sort() || [],
      maxResults: options.maxResults || 10,
      similarityThreshold: options.similarityThreshold || 0.7
    };
    return createHash('md5').update(JSON.stringify(searchParams)).digest('hex');
  }

  // Clean expired entries
  private cleanExpired<T>(cache: Map<string, CacheEntry<T>>): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
      }
    }
  }

  // Evict least recently used entries
  private evictLRU<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
    if (cache.size <= maxSize) return;
    
    const entries = Array.from(cache.entries());
    // Sort by hits (ascending) then by timestamp (ascending)
    entries.sort((a, b) => {
      if (a[1].hits !== b[1].hits) {
        return a[1].hits - b[1].hits;
      }
      return a[1].timestamp - b[1].timestamp;
    });
    
    const toRemove = cache.size - maxSize;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  // Cache embedding vector
  setEmbedding(text: string, embedding: number[]): void {
    const key = this.generateKey(text);
    
    this.cleanExpired(this.embeddingCache);
    this.evictLRU(this.embeddingCache, this.maxEmbeddingCacheSize);
    
    this.embeddingCache.set(key, {
      data: [...embedding], // Clone array
      timestamp: Date.now(),
      hits: 1,
      ttl: this.embeddingTTL
    });
  }

  // Get cached embedding vector
  getEmbedding(text: string): number[] | null {
    const key = this.generateKey(text);
    const entry = this.embeddingCache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.embeddingCache.delete(key);
      this.totalMisses++;
      return null;
    }
    
    // Update hit count and return
    entry.hits++;
    this.totalHits++;
    return [...entry.data]; // Return cloned array
  }

  // Cache search query embedding
  setQueryEmbedding(query: string, embedding: number[]): void {
    const key = this.generateKey(query);
    
    this.cleanExpired(this.queryCache);
    this.evictLRU(this.queryCache, this.maxQueryCacheSize);
    
    this.queryCache.set(key, {
      data: [...embedding],
      timestamp: Date.now(),
      hits: 1,
      ttl: this.queryTTL
    });
  }

  // Get cached search query embedding
  getQueryEmbedding(query: string): number[] | null {
    const key = this.generateKey(query);
    const entry = this.queryCache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(key);
      this.totalMisses++;
      return null;
    }
    
    entry.hits++;
    this.totalHits++;
    return [...entry.data];
  }

  // Cache search results
  setSearchResults(query: string, options: any, results: any): void {
    const key = this.generateSearchKey(query, options);
    
    this.cleanExpired(this.searchResultCache);
    this.evictLRU(this.searchResultCache, this.maxSearchCacheSize);
    
    this.searchResultCache.set(key, {
      data: JSON.parse(JSON.stringify(results)), // Deep clone
      timestamp: Date.now(),
      hits: 1,
      ttl: this.searchTTL
    });
  }

  // Get cached search results
  getSearchResults(query: string, options: any): any | null {
    const key = this.generateSearchKey(query, options);
    const entry = this.searchResultCache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.searchResultCache.delete(key);
      this.totalMisses++;
      return null;
    }
    
    entry.hits++;
    this.totalHits++;
    return JSON.parse(JSON.stringify(entry.data)); // Return deep clone
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? this.totalHits / totalRequests : 0;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    
    // Embedding cache (384 dimensions * 8 bytes per float)
    memoryUsage += this.embeddingCache.size * 384 * 8;
    
    // Query cache
    memoryUsage += this.queryCache.size * 384 * 8;
    
    // Search result cache (estimate 1KB per result)
    memoryUsage += this.searchResultCache.size * 1024;
    
    return {
      size: this.embeddingCache.size + this.queryCache.size + this.searchResultCache.size,
      maxSize: this.maxEmbeddingCacheSize + this.maxQueryCacheSize + this.maxSearchCacheSize,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate,
      memoryUsage
    };
  }

  // Get detailed cache info
  getDetailedStats(): {
    embedding: { size: number; maxSize: number };
    query: { size: number; maxSize: number };
    search: { size: number; maxSize: number };
    overall: CacheStats;
  } {
    return {
      embedding: {
        size: this.embeddingCache.size,
        maxSize: this.maxEmbeddingCacheSize
      },
      query: {
        size: this.queryCache.size,
        maxSize: this.maxQueryCacheSize
      },
      search: {
        size: this.searchResultCache.size,
        maxSize: this.maxSearchCacheSize
      },
      overall: this.getStats()
    };
  }

  // Clear specific cache type
  clearEmbeddingCache(): void {
    this.embeddingCache.clear();
  }

  clearQueryCache(): void {
    this.queryCache.clear();
  }

  clearSearchCache(): void {
    this.searchResultCache.clear();
  }

  // Clear all caches
  clearAll(): void {
    this.embeddingCache.clear();
    this.queryCache.clear();
    this.searchResultCache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  // Preload common queries (for warmup)
  preloadCommonQueries(queries: string[]): void {
    // This would be called during warmup to cache common search terms
    console.log(`Preloading ${queries.length} common queries for caching`);
  }

  // Get cache health status
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check hit rate
    if (stats.hitRate < 0.3) {
      issues.push('Low cache hit rate');
      recommendations.push('Consider increasing cache TTL or size');
      status = 'warning';
    }

    // Check memory usage (rough threshold: 50MB)
    if (stats.memoryUsage > 50 * 1024 * 1024) {
      issues.push('High memory usage');
      recommendations.push('Consider reducing cache sizes');
      if (status === 'healthy') status = 'warning';
    }

    // Check cache utilization
    const utilization = stats.size / stats.maxSize;
    if (utilization > 0.9) {
      issues.push('Cache near capacity');
      recommendations.push('Consider increasing cache size or reducing TTL');
      if (status === 'healthy') status = 'warning';
    }

    return { status, issues, recommendations };
  }
}

// Singleton instance
let cacheInstance: EmbeddingCache | null = null;

export function getEmbeddingCache(): EmbeddingCache {
  if (!cacheInstance) {
    cacheInstance = new EmbeddingCache();
  }
  return cacheInstance;
}

// Utility functions
export function getCachedEmbedding(text: string): number[] | null {
  return getEmbeddingCache().getEmbedding(text);
}

export function setCachedEmbedding(text: string, embedding: number[]): void {
  getEmbeddingCache().setEmbedding(text, embedding);
}

export function getCachedQueryEmbedding(query: string): number[] | null {
  return getEmbeddingCache().getQueryEmbedding(query);
}

export function setCachedQueryEmbedding(query: string, embedding: number[]): void {
  getEmbeddingCache().setQueryEmbedding(query, embedding);
}

export function getCachedSearchResults(query: string, options: any): any | null {
  return getEmbeddingCache().getSearchResults(query, options);
}

export function setCachedSearchResults(query: string, options: any, results: any): void {
  getEmbeddingCache().setSearchResults(query, options, results);
}

export function getEmbeddingCacheStats() {
  return getEmbeddingCache().getStats();
}

export function getDetailedCacheStats() {
  return getEmbeddingCache().getDetailedStats();
}

export function getCacheHealthStatus() {
  return getEmbeddingCache().getHealthStatus();
}
