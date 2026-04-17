/**
 * Client-side embedding cache using IndexedDB
 * Stores embeddings with 7-day expiration and 100MB size limit
 */

const DB_NAME = 'studify-embeddings';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';
const MAX_CACHE_SIZE_MB = 100;
const CACHE_EXPIRATION_DAYS = 7;
const CACHE_EXPIRATION_MS = CACHE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

interface CachedEmbedding {
  key: string;
  embedding: number[];
  timestamp: number;
  size: number; // Size in bytes
}

interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

let dbInstance: IDBDatabase | null = null;
let initializationPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize IndexedDB database
 */
async function initializeDB(): Promise<IDBDatabase> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // Return existing initialization promise if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[EmbeddingCache] IndexedDB initialized');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[EmbeddingCache] Object store created');
      }
    };
  });

  return initializationPromise;
}

/**
 * Generate cache key from text using SHA-256
 */
async function generateCacheKey(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback to simple hash for environments without crypto.subtle
    return `key_${text.length}_${text.substring(0, 50)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Calculate size of embedding in bytes
 */
function calculateEmbeddingSize(embedding: number[]): number {
  // Each number is 8 bytes (Float64)
  return embedding.length * 8;
}

/**
 * Get cached embedding by text
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  try {
    const db = await initializeDB();
    const key = await generateCacheKey(text);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedEmbedding | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        const age = Date.now() - result.timestamp;
        if (age > CACHE_EXPIRATION_MS) {
          console.log('[EmbeddingCache] Cache entry expired, removing');
          // Delete expired entry asynchronously
          deleteCachedEmbedding(text).catch(console.error);
          resolve(null);
          return;
        }

        console.log('[EmbeddingCache] Cache hit');
        resolve(result.embedding);
      };

      request.onerror = () => {
        console.error('[EmbeddingCache] Failed to get cached embedding');
        reject(new Error('Failed to get cached embedding'));
      };
    });
  } catch (error) {
    console.error('[EmbeddingCache] Error getting cached embedding:', error);
    return null;
  }
}

/**
 * Set cached embedding for text
 */
export async function setCachedEmbedding(
  text: string,
  embedding: number[]
): Promise<void> {
  try {
    const db = await initializeDB();
    const key = await generateCacheKey(text);
    const size = calculateEmbeddingSize(embedding);

    // Check cache size before adding
    const stats = await getCacheStats();
    const newSizeMB = (stats.totalSizeBytes + size) / (1024 * 1024);

    if (newSizeMB > MAX_CACHE_SIZE_MB) {
      console.warn('[EmbeddingCache] Cache size limit reached, cleaning old entries');
      await cleanOldEntries();
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      const cachedData: CachedEmbedding = {
        key,
        embedding,
        timestamp: Date.now(),
        size,
      };

      const request = objectStore.put(cachedData);

      request.onsuccess = () => {
        console.log('[EmbeddingCache] Embedding cached');
        resolve();
      };

      request.onerror = () => {
        console.error('[EmbeddingCache] Failed to cache embedding');
        reject(new Error('Failed to cache embedding'));
      };
    });
  } catch (error) {
    console.error('[EmbeddingCache] Error caching embedding:', error);
    throw error;
  }
}

/**
 * Delete cached embedding
 */
async function deleteCachedEmbedding(text: string): Promise<void> {
  try {
    const db = await initializeDB();
    const key = await generateCacheKey(text);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete cached embedding'));
      };
    });
  } catch (error) {
    console.error('[EmbeddingCache] Error deleting cached embedding:', error);
    throw error;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const entries = request.result as CachedEmbedding[];

        if (entries.length === 0) {
          resolve({
            totalEntries: 0,
            totalSizeBytes: 0,
            totalSizeMB: 0,
            oldestEntry: null,
            newestEntry: null,
          });
          return;
        }

        const totalSizeBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
        const timestamps = entries.map(e => e.timestamp);

        resolve({
          totalEntries: entries.length,
          totalSizeBytes,
          totalSizeMB: totalSizeBytes / (1024 * 1024),
          oldestEntry: Math.min(...timestamps),
          newestEntry: Math.max(...timestamps),
        });
      };

      request.onerror = () => {
        reject(new Error('Failed to get cache stats'));
      };
    });
  } catch (error) {
    console.error('[EmbeddingCache] Error getting cache stats:', error);
    return {
      totalEntries: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}

/**
 * Clean old entries to free up space
 * Removes oldest 25% of entries
 */
async function cleanOldEntries(): Promise<void> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const index = objectStore.index('timestamp');
      const request = index.openCursor();

      const entriesToDelete: string[] = [];
      let totalEntries = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          totalEntries++;
          cursor.continue();
        } else {
          // Delete oldest 25%
          const deleteCount = Math.ceil(totalEntries * 0.25);
          
          // Reopen cursor to delete entries
          const deleteRequest = index.openCursor();
          let deletedCount = 0;

          deleteRequest.onsuccess = (e) => {
            const deleteCursor = (e.target as IDBRequest).result;

            if (deleteCursor && deletedCount < deleteCount) {
              deleteCursor.delete();
              deletedCount++;
              deleteCursor.continue();
            } else {
              console.log(`[EmbeddingCache] Cleaned ${deletedCount} old entries`);
              resolve();
            }
          };

          deleteRequest.onerror = () => {
            reject(new Error('Failed to clean old entries'));
          };
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to clean old entries'));
      };
    });
  } catch (error) {
    console.error('[EmbeddingCache] Error cleaning old entries:', error);
    throw error;
  }
}

/**
 * Clear all cached embeddings
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('[EmbeddingCache] Cache cleared');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear cache'));
      };
    });
  } catch (error) {
    console.error('[EmbeddingCache] Error clearing cache:', error);
    throw error;
  }
}
