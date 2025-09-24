// Video AI Assistant Cache System
// 智能缓存机制：内存缓存 + localStorage + 问题相似度匹配

interface CacheEntry {
  question: string;
  answer: string;
  sources: any[];
  confidence: number;
  videoContext: {
    courseSlug: string;
    currentLessonId?: string;
    currentTimestamp?: number;
  };
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  questionHash: string;
}

interface SimilarityResult {
  entry: CacheEntry;
  similarity: number;
}

export class VideoAICacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly CACHE_PREFIX = 'video_ai_cache_';
  private readonly MAX_MEMORY_ENTRIES = 50;
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SIMILARITY_THRESHOLD = 0.75;
  private readonly MAX_STORAGE_ENTRIES = 200;

  constructor() {
    this.loadFromStorage();
    this.setupCleanupInterval();
  }

  /**
   * Generate cache key from question and context
   */
  private generateCacheKey(question: string, videoContext: any): string {
    const contextKey = `${videoContext.courseSlug}_${videoContext.currentLessonId || 'any'}_${Math.floor((videoContext.currentTimestamp || 0) / 60)}min`;
    return `${this.hashString(question)}_${this.hashString(contextKey)}`;
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calculate question similarity using simple word overlap
   */
  private calculateSimilarity(question1: string, question2: string): number {
    const normalize = (text: string) => text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '') // Keep only words and Chinese characters
      .split(/\s+/)
      .filter(word => word.length > 1);

    const words1 = normalize(question1);
    const words2 = normalize(question2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Find similar cached questions
   */
  private findSimilarQuestions(question: string, videoContext: any): SimilarityResult[] {
    const results: SimilarityResult[] = [];
    
    // Search memory cache
    for (const entry of this.memoryCache.values()) {
      // Only match within same course context
      if (entry.videoContext.courseSlug !== videoContext.courseSlug) continue;
      
      const similarity = this.calculateSimilarity(question, entry.question);
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        results.push({ entry, similarity });
      }
    }
    
    // Sort by similarity (highest first)
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Get cached response (exact match or similar question)
   */
  async get(question: string, videoContext: any): Promise<CacheEntry | null> {
    const cacheKey = this.generateCacheKey(question, videoContext);
    
    // Try exact match first
    let cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      cached.hitCount++;
      console.log(`🎯 Cache hit (exact): ${question.substring(0, 50)}...`);
      return cached;
    }

    // Try similar question matching
    const similarQuestions = this.findSimilarQuestions(question, videoContext);
    if (similarQuestions.length > 0) {
      const best = similarQuestions[0];
      best.entry.hitCount++;
      console.log(`🎯 Cache hit (similar ${(best.similarity * 100).toFixed(1)}%): ${best.entry.question.substring(0, 50)}...`);
      
      // Update the entry with new question for future exact matches
      const updatedEntry = {
        ...best.entry,
        question,
        questionHash: this.hashString(question),
        timestamp: Date.now()
      };
      
      this.memoryCache.set(cacheKey, updatedEntry);
      return updatedEntry;
    }

    console.log(`❌ Cache miss: ${question.substring(0, 50)}...`);
    return null;
  }

  /**
   * Store response in cache
   */
  async set(
    question: string, 
    answer: string, 
    sources: any[], 
    confidence: number,
    videoContext: any
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(question, videoContext);
    const now = Date.now();
    
    const entry: CacheEntry = {
      question,
      answer,
      sources,
      confidence,
      videoContext,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION_MS,
      hitCount: 0,
      questionHash: this.hashString(question)
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);
    
    // Cleanup memory cache if too large
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      this.cleanupMemoryCache();
    }

    // Store in localStorage (async)
    this.saveToStorage();

    console.log(`💾 Cached response: ${question.substring(0, 50)}...`);
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    const entries = Array.from(this.memoryCache.entries());
    
    // Remove expired entries
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
    
    // If still too large, remove least recently used entries
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.memoryCache.size - this.MAX_MEMORY_ENTRIES);
      
      for (const [key] of sortedEntries) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
      let loadedCount = 0;
      
      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          if (entry.expiresAt > Date.now()) {
            const cacheKey = key.replace(this.CACHE_PREFIX, '');
            this.memoryCache.set(cacheKey, entry);
            loadedCount++;
          } else {
            // Remove expired entry
            localStorage.removeItem(key);
          }
        }
      }
      
      console.log(`📦 Loaded ${loadedCount} cached AI responses from storage`);
    } catch (error) {
      console.warn('⚠️ Failed to load cache from storage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      // Get all storage keys and clean up if needed
      const existingKeys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (existingKeys.length > this.MAX_STORAGE_ENTRIES) {
        // Remove oldest entries
        const entriesToRemove = existingKeys.slice(0, existingKeys.length - this.MAX_STORAGE_ENTRIES + 10);
        entriesToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // Save current memory cache to storage
      for (const [cacheKey, entry] of this.memoryCache.entries()) {
        const storageKey = `${this.CACHE_PREFIX}${cacheKey}`;
        localStorage.setItem(storageKey, JSON.stringify(entry));
      }
    } catch (error) {
      console.warn('⚠️ Failed to save cache to storage:', error);
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanupInterval(): void {
    // Clean up every 10 minutes
    setInterval(() => {
      this.cleanupMemoryCache();
      this.saveToStorage();
    }, 10 * 60 * 1000);
  }

  /**
   * Clear all cache (for debugging or user preference)
   */
  clearAll(): void {
    this.memoryCache.clear();
    
    // Clear localStorage
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    
    console.log('🗑️ Cleared all AI assistant cache');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    storageEntries: number;
    totalHits: number;
    avgConfidence: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const avgConfidence = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length 
      : 0;
    
    const storageKeys = Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX));
    
    return {
      memoryEntries: this.memoryCache.size,
      storageEntries: storageKeys.length,
      totalHits,
      avgConfidence
    };
  }
}

// Export singleton instance
export const videoAICache = new VideoAICacheManager();
