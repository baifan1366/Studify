import { Client } from '@upstash/qstash';
import { verifySignatureEdge } from '@upstash/qstash/dist/nextjs';

// Initialize QStash client with better error handling
let qstashClientInstance = null;

try {
  if (process.env.QSTASH_TOKEN) {
    qstashClientInstance = new Client({
      token: process.env.QSTASH_TOKEN
    });
    console.log('QStash client initialized successfully');
  } else {
    console.warn('QSTASH_TOKEN environment variable not set - QStash functionality disabled');
  }
} catch (error) {
  console.error('Error initializing QStash client:', error);
}

// Export the client instance (may be null if initialization failed)
export const qstashClient = qstashClientInstance;

/**
 * Verify that a request came from QStash
 * @param {Request} request - The incoming request object
 * @returns {Promise<boolean>} - Whether the request signature is valid
 */
export async function verifyQStashSignature(request) {
  try {
    // Skip verification in development mode or if QStash is not configured
    if (process.env.NODE_ENV !== 'production' || !qstashClient) {
      return true;
    }
    
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
      console.error('QStash signing keys are not configured correctly');
      return false;
    }
    
    // Clone the request to avoid consuming the body
    const clonedRequest = request.clone();
    
    // Get the signature from header
    const signature = clonedRequest.headers.get('upstash-signature');
    
    if (!signature) {
      console.error('Missing QStash signature header');
      return false;
    }
    
    // Get the body as a string
    const body = await clonedRequest.text();
    
    // Verify the signature
    try {
      const isValid = await verifySignatureEdge({
        signature,
        body,
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      });
      
      return isValid;
    } catch (verificationError) {
      console.error('QStash signature verification failed:', verificationError);
      return false;
    }
  } catch (error) {
    console.error('Error verifying QStash signature:', error);
    return false;
  }
}

/**
 * Schedule a job to be executed at a specific time
 * @param {string} url - The endpoint to call
 * @param {object} payload - The payload to send
 * @param {object} options - Additional options (delay, cron, etc)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleJob(url, payload, options = {}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    
    const response = await qstashClient.publishJSON({
      url: fullUrl,
      body: payload,
      ...options
    });
    
    return { 
      success: true, 
      messageId: response.messageId 
    };
  } catch (error) {
    console.error('Error scheduling QStash job:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Schedule a CRON job to be executed on a schedule
 * @param {string} url - The endpoint to call
 * @param {string} cron - The CRON schedule expression
 * @param {object} payload - The payload to send
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleCronJob(url, cron, payload = {}) {
  try {
    // Check if QStash client is available
    if (!qstashClient) {
      throw new Error('QStash client not initialized. Check QSTASH_TOKEN environment variable.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;

    console.log(`Scheduling CRON job: ${fullUrl} with cron: ${cron}`);

    const response = await qstashClient.publishJSON({
      url: fullUrl,
      body: payload,
      cron
    });

    console.log(`CRON job scheduled successfully:`, response);

    return {
      success: true,
      scheduleId: response.scheduleId
    };
  } catch (error) {
    console.error('Error scheduling QStash CRON job:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedule user embedding generation on a regular basis
 * @param {string} cronSchedule - CRON schedule expression (for every 2 hours)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleUserEmbeddingGeneration(cronSchedule = '0 */2 * * *') {
  return scheduleCronJob(
    '/api/actions/batch-process',
    cronSchedule,
    { action: 'process_user_embeddings' }
  );
}

/**
 * Schedule post publishing on a regular basis
 * @param {string} cronSchedule - CRON schedule expression (default: every minute)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function schedulePostPublishing(cronSchedule = '* * * * *') {
  return scheduleCronJob(
    '/api/actions/publish-posts',
    cronSchedule,
    { action: 'publish_scheduled_posts' }
  );
}

/**
 * Schedule user action processing
 * @param {number} intervalSeconds - Interval in seconds (default: 10)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleUserActionProcessing(intervalSeconds = 10) {
  const cronSchedule = `*/${intervalSeconds} * * * * *`; // Every N seconds
  return scheduleCronJob(
    '/api/actions/batch-process',
    cronSchedule,
    { action: 'process_user_actions' }
  );
}

/**
 * Schedule recommendation cache warming
 * @param {string} cronSchedule - CRON schedule expression (default: hourly)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleRecommendationCacheWarming(cronSchedule = '0 * * * *') {
  return scheduleCronJob(
    '/api/recommend/cache/warm',
    cronSchedule,
    { action: 'warm_cache' }
  );
}

/**
 * Schedule ranking model training
 * @param {string} cronSchedule - CRON schedule expression (default: daily at 3 AM)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleRankingModelTraining(cronSchedule = '0 3 * * *') {
  return scheduleCronJob(
    '/api/ml/train-ranking-model',
    cronSchedule,
    { action: 'train_ranking_model' }
  );
}

/**
 * Schedule cold start content refresh
 * @param {string} cronSchedule - CRON schedule expression (default: every 6 hours)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleColdStartContentRefresh(cronSchedule = '0 */6 * * *') {
  return scheduleCronJob(
    '/api/recommend/cold-start/refresh',
    cronSchedule,
    { action: 'refresh_cold_start_content' }
  );
}

/**
 * Schedule comment operations processing
 * @param {string} cronSchedule - CRON schedule expression (default: every 30 seconds)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleCommentProcessing(cronSchedule = '*/30 * * * * *') {
  return scheduleCronJob(
    '/api/actions/process-comments',
    cronSchedule,
    { action: 'process_comment_operations' }
  );
}

/**
 * Schedule like operations processing
 * @param {string} cronSchedule - CRON schedule expression (default: every 30 seconds)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleLikeProcessing(cronSchedule = '*/30 * * * * *') {
  return scheduleCronJob(
    '/api/actions/process-likes',
    cronSchedule,
    { action: 'process_like_operations' }
  );
}

/**
 * Schedule hot comments cache refresh
 * @param {string} cronSchedule - CRON schedule expression (default: every 5 minutes)
 * @returns {Promise<object>} - The scheduled job response
 */
export async function scheduleHotCommentsRefresh(cronSchedule = '*/5 * * * *') {
  return scheduleCronJob(
    '/api/actions/refresh-hot-comments',
    cronSchedule,
    { action: 'refresh_hot_comments' }
  );
}

/**
 * Initialize all recommendation system jobs
 * @returns {Promise<object>} - Results of all scheduled jobs
 */
export async function initializeRecommendationJobs() {
  const results = {};

  try {
    // Schedule user embedding generation (every 2 hours)
    results.userEmbeddings = await scheduleUserEmbeddingGeneration('0 */2 * * *');

    // Schedule user action processing (every 10 seconds)
    results.userActions = await scheduleUserActionProcessing(10);

    // Schedule recommendation cache warming (hourly)
    results.cacheWarming = await scheduleRecommendationCacheWarming('0 * * * *');

    // Schedule cold start content refresh (every 6 hours)
    results.coldStart = await scheduleColdStartContentRefresh('0 */6 * * *');

    // Schedule comment processing (every 30 seconds)
    results.commentProcessing = await scheduleCommentProcessing('*/30 * * * * *');

    // Schedule like processing (every 30 seconds)
    results.likeProcessing = await scheduleLikeProcessing('*/30 * * * * *');

    // Schedule hot comments refresh (every 5 minutes)
    results.hotCommentsRefresh = await scheduleHotCommentsRefresh('*/5 * * * *');

    return {
      success: true,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      results
    };
  }
}