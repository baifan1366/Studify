import { Redis } from '@upstash/redis'

/**
 * Redis client instance from Upstash
 * Uses environment variables for configuration:
 * - UPSTASH_REDIS_REST_URL: The REST URL for Upstash Redis
 * - UPSTASH_REDIS_REST_TOKEN: The authentication token for Upstash Redis
 */
let redis = null;

// Validate required environment variables
const url = process.env.UPSTASH_REDIS_REST_URL || 'https://adjusted-beetle-21820.upstash.io';
const token = process.env.UPSTASH_REDIS_REST_TOKEN || 'AVU8AAIjcDFmNjE5MDIzZDQ0OGI0MDIwYTg4MmFmY2I2YWYyY2YzZnAxMA';

if (!url || !token) {
  throw new Error('Missing required Upstash Redis environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
}

try {
  redis = new Redis({
    url,
    token,
    // Add retry configuration for better reliability
    retry: {
      retries: 3,
      retryDelayOnFailure: 1000,
    },
    // Add timeout configuration
    requestTimeout: 10000,
  });

  console.log('Upstash Redis client initialized successfully');

  // Test connection (non-blocking)
  redis.ping()
    .then(() => console.log('✅ Upstash Redis connection test successful'))
    .catch((error) => console.error('❌ Upstash Redis connection test failed:', error));

} catch (error) {
  console.error('❌ Failed to initialize Upstash Redis client:', error);
  throw error; // Don't fall back to mock, fail fast
}

/**
 * Example usage:
 * ```js
 * await redis.set("key", "value");
 * const value = await redis.get("key");
 * ```
 */

export default redis 