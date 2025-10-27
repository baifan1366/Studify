// Dual Embedding server URLs
const E5_EMBEDDING_SERVER_URL = process.env.E5_HG_EMBEDDING_SERVER_API_URL || "https://edusocial-e5-small-embedding-server.hf.space";
const BGE_EMBEDDING_SERVER_URL = process.env.BGE_HG_EMBEDDING_SERVER_API_URL || "https://edusocial-bge-m3-embedding-server.hf.space";

// Legacy fallback (keeping for backwards compatibility)
const EMBEDDING_SERVER_URL = E5_EMBEDDING_SERVER_URL;

// 设置超时时间（毫秒）
const DEFAULT_API_TIMEOUT = 30000; // 30秒超时
const BACKGROUND_API_TIMEOUT = 120000; // 120秒超时，用于后台处理
const SERVER_WARMUP_TIMEOUT = 300000; // 5分钟超时，用于服务器唤醒

// HF服务器睡眠相关配置
const HF_SLEEP_INDICATORS = [
  'server is sleeping',
  'loading model', 
  'model is loading',
  'application startup is in progress',
  'service unavailable',
  'connection refused',
  'fetch failed',
  'network error'
];

const MAX_WARMUP_RETRIES = 3;
const WARMUP_RETRY_DELAYS = [30000, 60000, 120000]; // 30s, 1min, 2min

// Types for dual embedding API
interface EmbeddingRequest {
  input: string;
}

interface BatchRequest {
  inputs: string[];
}

interface EmbeddingResponse {
  embedding: number[];
  dim?: number;
  token_count?: number;
}

interface BatchEmbeddingResponse {
  embeddings: number[][];
  count?: number;
  dim?: number;
  token_counts?: number[];
}

export interface DualEmbeddingResponse {
  e5_embedding?: number[];
  bge_embedding?: number[];
  e5_dim?: number;
  bge_dim?: number;
  token_count?: number;
}

interface EmbeddingError {
  error: string;
  details?: string;
}

interface ServerHealthStatus {
  isHealthy: boolean;
  isSleeping: boolean;
  canRetry: boolean;
  estimatedWarmupTime?: number;
}

// Embedding model types
export type EmbeddingModel = 'e5' | 'bge';
export type EmbeddingDimension = 384 | 1024;

// Model configuration
export const EMBEDDING_MODELS = {
  e5: {
    url: E5_EMBEDDING_SERVER_URL,
    dimensions: 384 as EmbeddingDimension,
    model_name: 'intfloat/e5-small'
  },
  bge: {
    url: BGE_EMBEDDING_SERVER_URL,
    dimensions: 1024 as EmbeddingDimension,
    model_name: 'BAAI/bge-m3'
  }
};

// Utility function to create fetch with timeout
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

// Check if error indicates server is sleeping
function isServerSleeping(error: string): boolean {
  const errorLower = error.toLowerCase();
  return HF_SLEEP_INDICATORS.some(indicator => errorLower.includes(indicator));
}

// Check server health status
export async function checkServerHealth(serverUrl: string): Promise<ServerHealthStatus> {
  try {
    console.log(`Checking health for: ${serverUrl}`);
    
    // First try the healthz endpoint
    const healthResponse = await fetchWithTimeout(
      `${serverUrl}/healthz`,
      { method: 'GET' },
      10000 // 10s timeout for health check
    );

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      if (healthData.status === 'ok') {
        return { isHealthy: true, isSleeping: false, canRetry: false };
      }
    }
    
    // If healthz fails, try root endpoint to wake up server
    const rootResponse = await fetchWithTimeout(
      serverUrl,
      { method: 'GET' },
      15000 // 15s timeout for root check
    );

    if (rootResponse.ok) {
      return { isHealthy: false, isSleeping: true, canRetry: true, estimatedWarmupTime: 60000 };
    }

    return { isHealthy: false, isSleeping: true, canRetry: true, estimatedWarmupTime: 120000 };
    
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    const isSleeping = isServerSleeping(errorMessage);
    
    console.log(`Server health check failed: ${errorMessage}, sleeping: ${isSleeping}`);
    
    return {
      isHealthy: false,
      isSleeping,
      canRetry: isSleeping,
      estimatedWarmupTime: isSleeping ? 90000 : undefined
    };
  }
}

// Wake up server by making requests
async function wakeUpServer(serverUrl: string, model: EmbeddingModel): Promise<boolean> {
  console.log(`🔄 Waking up ${model.toUpperCase()} server: ${serverUrl}`);
  
  // Try to wake up with simple requests - fire them in parallel to speed up
  const wakeUpRequests = [
    // 1. Hit the root endpoint
    fetchWithTimeout(serverUrl, { method: 'GET' }, 10000).catch(e => {
      console.log(`  ↳ Root endpoint: ${e.message}`);
      return null;
    }),
    // 2. Hit the health endpoint 
    fetchWithTimeout(`${serverUrl}/healthz`, { method: 'GET' }, 10000).catch(e => {
      console.log(`  ↳ Health endpoint: ${e.message}`);
      return null;
    }),
    // 3. Send a simple embedding request to trigger model loading
    fetchWithTimeout(
      `${serverUrl}/embed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test' })
      },
      15000
    ).catch(e => {
      console.log(`  ↳ Embed endpoint: ${e.message}`);
      return null;
    })
  ];

  // Fire all requests in parallel
  console.log(`  ↳ Sending wake-up requests to ${model.toUpperCase()}...`);
  await Promise.all(wakeUpRequests);
  
  // Wait a bit for server to initialize
  console.log(`  ↳ Waiting 5s for ${model.toUpperCase()} to initialize...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Final health check
  const finalHealthCheck = await checkServerHealth(serverUrl);
  const isAwake = finalHealthCheck.isHealthy || !finalHealthCheck.isSleeping;
  
  console.log(`${isAwake ? '✅' : '❌'} ${model.toUpperCase()} wake-up ${isAwake ? 'SUCCESS' : 'FAILED'}`);
  return isAwake;
}

// Smart embedding generation with server wake-up handling
export async function generateEmbeddingWithWakeup(
  text: string, 
  model: EmbeddingModel = 'e5',
  maxRetries: number = MAX_WARMUP_RETRIES
): Promise<{
  embedding: number[];
  tokenCount?: number;
  dimensions: number;
  model: string;
  wasServerSleeping?: boolean;
  wakeupAttempts?: number;
}> {
  const processedText = preprocessTextForEmbedding(text);
  
  if (!processedText) {
    throw new Error('Text preprocessing resulted in empty content');
  }

  const modelConfig = EMBEDDING_MODELS[model];
  if (!modelConfig) {
    throw new Error(`Unknown embedding model: ${model}`);
  }

  // Check cache first
  const { getCachedEmbedding, setCachedEmbedding } = await import('./embedding-cache');
  const cacheKey = `${model}:${processedText}`;
  const cachedEmbedding = getCachedEmbedding(cacheKey);
  if (cachedEmbedding) {
    return { 
      embedding: cachedEmbedding, 
      dimensions: modelConfig.dimensions,
      model: modelConfig.model_name
    };
  }

  let wasServerSleeping = false;
  let wakeupAttempts = 0;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  ↳ ${model.toUpperCase()} attempt ${attempt}/${maxRetries}`);
      
      const requestBody: EmbeddingRequest = {
        input: processedText
      };

      const timeout = attempt === 1 ? DEFAULT_API_TIMEOUT : SERVER_WARMUP_TIMEOUT;
      const response = await fetchWithTimeout(
        `${modelConfig.url}/embed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        timeout
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = `${model.toUpperCase()} API error: ${response.status} - ${errorData.error || 'Unknown error'}`;
        
        // Check if this indicates server sleeping
        if (isServerSleeping(errorMessage) && attempt < maxRetries) {
          wasServerSleeping = true;
          wakeupAttempts++;
          console.log(`  ⚠️ ${model.toUpperCase()} server sleeping, waking up...`);
          
          // Try to wake up the server
          const wakeUpSuccess = await wakeUpServer(modelConfig.url, model);
          
          if (wakeUpSuccess) {
            console.log(`  ↳ Retrying ${model.toUpperCase()} after wake-up...`);
            // Shorter wait after successful wake-up
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue; // Retry the request
          } else {
            console.log(`  ↳ Wake-up uncertain, retrying ${model.toUpperCase()} anyway...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            continue; // Still retry even if wake-up failed
          }
        }
        
        throw new Error(errorMessage);
      }

      const data: EmbeddingResponse = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error(`Invalid ${model} embedding response format`);
      }

      // Validate embedding dimensions
      if (data.embedding.length !== modelConfig.dimensions) {
        console.warn(`⚠️ ${model.toUpperCase()} embedding dimension mismatch: expected ${modelConfig.dimensions}, got ${data.embedding.length}`);
        console.warn(`⚠️ This suggests the ${model.toUpperCase()} server may be misconfigured or pointing to the wrong model`);
        throw new Error(`${model} embedding dimension mismatch: expected ${modelConfig.dimensions}, got ${data.embedding.length}`);
      }

      const embeddingResult = {
        embedding: data.embedding,
        tokenCount: data.token_count,
        dimensions: modelConfig.dimensions,
        model: modelConfig.model_name,
        wasServerSleeping,
        wakeupAttempts
      };

      // Cache the successful result
      setCachedEmbedding(cacheKey, embeddingResult.embedding);
      
      console.log(`  ✅ ${model.toUpperCase()} success (${data.embedding.length}D)${wasServerSleeping ? ` after ${wakeupAttempts} wake-ups` : ''}`);
      return embeddingResult;
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ ${model.toUpperCase()} attempt ${attempt} failed: ${errorMessage.substring(0, 100)}`);
      
      // Check if we should retry due to server sleeping
      if (isServerSleeping(errorMessage) && attempt < maxRetries) {
        wasServerSleeping = true;
        wakeupAttempts++;
        console.log(`  ⚠️ ${model.toUpperCase()} sleeping detected, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 15000)); // Shorter wait
        continue;
      }
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate ${model} embedding after ${maxRetries} attempts: ${errorMessage}`);
      }
      
      // For other errors, wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  throw new Error(`Failed to generate ${model} embedding: Maximum retries exceeded`);
}

// Legacy function that uses the new wake-up logic
export async function generateEmbedding(
  text: string, 
  model: EmbeddingModel = 'e5'
): Promise<{
  embedding: number[];
  tokenCount?: number;
  dimensions: number;
  model: string;
}> {
  const result = await generateEmbeddingWithWakeup(text, model);
  return {
    embedding: result.embedding,
    tokenCount: result.tokenCount,
    dimensions: result.dimensions,
    model: result.model
  };
}

// Smart dual embedding function with parallel processing to speed up
export async function generateDualEmbeddingWithWakeup(text: string): Promise<DualEmbeddingResponse & {
  e5_success: boolean;
  bge_success: boolean;
  e5_was_sleeping?: boolean;
  bge_was_sleeping?: boolean;
}> {
  const processedText = preprocessTextForEmbedding(text);
  
  if (!processedText) {
    throw new Error('Text preprocessing resulted in empty content');
  }

  console.log('🚀 Generating dual embeddings in parallel...');
  
  // Try both embeddings in parallel for speed
  const [e5Result, bgeResult] = await Promise.allSettled([
    (async () => {
      console.log('  ↳ Starting E5 embedding...');
      const result = await generateEmbeddingWithWakeup(text, 'e5');
      console.log('  ✅ E5 completed');
      return result;
    })(),
    (async () => {
      console.log('  ↳ Starting BGE embedding...');
      const result = await generateEmbeddingWithWakeup(text, 'bge');
      console.log('  ✅ BGE completed');
      return result;
    })()
  ]);

  // Process results
  let e5Success = false;
  let e5WasSleeping = false;
  let e5Data: any = null;
  
  if (e5Result.status === 'fulfilled') {
    e5Success = true;
    e5Data = e5Result.value;
    e5WasSleeping = e5Result.value.wasServerSleeping || false;
  } else {
    console.log('  ❌ E5 failed:', e5Result.reason?.message || 'Unknown error');
  }
  
  let bgeSuccess = false;
  let bgeWasSleeping = false;
  let bgeData: any = null;
  
  if (bgeResult.status === 'fulfilled') {
    bgeSuccess = true;
    bgeData = bgeResult.value;
    bgeWasSleeping = bgeResult.value.wasServerSleeping || false;
  } else {
    console.log('  ❌ BGE failed:', bgeResult.reason?.message || 'Unknown error');
  }

  // Prepare response
  const response: DualEmbeddingResponse & {
    e5_success: boolean;
    bge_success: boolean;
    e5_was_sleeping?: boolean;
    bge_was_sleeping?: boolean;
  } = {
    e5_success: e5Success,
    bge_success: bgeSuccess
  };

  if (e5Success && e5Data) {
    response.e5_embedding = e5Data.embedding;
    response.e5_dim = e5Data.dimensions;
    response.token_count = e5Data.tokenCount;
    response.e5_was_sleeping = e5WasSleeping;
  }

  if (bgeSuccess && bgeData) {
    response.bge_embedding = bgeData.embedding;
    response.bge_dim = bgeData.dimensions;
    // Use BGE token count if E5 didn't provide one
    if (!response.token_count) {
      response.token_count = bgeData.tokenCount;
    }
    response.bge_was_sleeping = bgeWasSleeping;
  }

  // At least one embedding should succeed
  if (!e5Success && !bgeSuccess) {
    throw new Error('Both E5 and BGE embeddings failed after wake-up attempts');
  }

  const successCount = (e5Success ? 1 : 0) + (bgeSuccess ? 1 : 0);
  console.log(`✅ Dual embedding completed: ${successCount}/2 successful (E5: ${e5Success}, BGE: ${bgeSuccess})`);
  
  return response;
}

// Legacy dual embedding function
export async function generateDualEmbedding(text: string): Promise<DualEmbeddingResponse> {
  const result = await generateDualEmbeddingWithWakeup(text);
  return {
    e5_embedding: result.e5_embedding,
    bge_embedding: result.bge_embedding,
    e5_dim: result.e5_dim,
    bge_dim: result.bge_dim,
    token_count: result.token_count
  };
}

// Batch embedding function for specific model
export async function generateBatchEmbeddings(
  texts: string[],
  model: EmbeddingModel = 'e5',
  timeout: number = BACKGROUND_API_TIMEOUT
): Promise<{ embeddings: number[][]; tokenCounts?: number[]; model: string; dimensions: number }> {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  const modelConfig = EMBEDDING_MODELS[model];
  if (!modelConfig) {
    throw new Error(`Unknown embedding model: ${model}`);
  }

  // Filter out empty texts
  const validTexts = texts.filter(text => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    throw new Error('No valid texts provided');
  }

  const requestBody: BatchRequest = {
    inputs: validTexts.map(text => text.trim())
  };

  try {
    const response = await fetchWithTimeout(
      `${modelConfig.url}/embed/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`${model.toUpperCase()} Batch embedding API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data: BatchEmbeddingResponse = await response.json();
    
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error(`Invalid ${model} batch embedding response format`);
    }

    // Validate all embedding dimensions
    for (let i = 0; i < data.embeddings.length; i++) {
      if (data.embeddings[i].length !== modelConfig.dimensions) {
        throw new Error(`${model} batch embedding dimension mismatch at index ${i}: expected ${modelConfig.dimensions}, got ${data.embeddings[i].length}`);
      }
    }

    return {
      embeddings: data.embeddings,
      tokenCounts: data.token_counts,
      model: modelConfig.model_name,
      dimensions: modelConfig.dimensions
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate ${model} batch embeddings: ${error.message}`);
    }
    throw new Error(`Failed to generate ${model} batch embeddings: Unknown error`);
  }
}

// Dual batch embedding function
export async function generateDualBatchEmbeddings(
  texts: string[],
  timeout: number = BACKGROUND_API_TIMEOUT
): Promise<{
  e5_embeddings?: number[][];
  bge_embeddings?: number[][];
  e5_token_counts?: number[];
  bge_token_counts?: number[];
  success_count: number;
  e5_success: boolean;
  bge_success: boolean;
}> {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  // Generate both batch embeddings in parallel
  const [e5Result, bgeResult] = await Promise.allSettled([
    generateBatchEmbeddings(texts, 'e5', timeout),
    generateBatchEmbeddings(texts, 'bge', timeout)
  ]);

  const response: {
    e5_embeddings?: number[][];
    bge_embeddings?: number[][];
    e5_token_counts?: number[];
    bge_token_counts?: number[];
    success_count: number;
    e5_success: boolean;
    bge_success: boolean;
  } = {
    success_count: 0,
    e5_success: false,
    bge_success: false
  };

  if (e5Result.status === 'fulfilled') {
    response.e5_embeddings = e5Result.value.embeddings;
    response.e5_token_counts = e5Result.value.tokenCounts;
    response.e5_success = true;
    response.success_count++;
  }

  if (bgeResult.status === 'fulfilled') {
    response.bge_embeddings = bgeResult.value.embeddings;
    response.bge_token_counts = bgeResult.value.tokenCounts;
    response.bge_success = true;
    response.success_count++;
  }

  // At least one batch should succeed
  if (response.success_count === 0) {
    const errors = [];
    if (e5Result.status === 'rejected') errors.push(`E5: ${e5Result.reason}`);
    if (bgeResult.status === 'rejected') errors.push(`BGE: ${bgeResult.reason}`);
    throw new Error(`Both batch embeddings failed: ${errors.join(', ')}`);
  }

  return response;
}

// Legacy retry wrapper - now uses smart wake-up logic
export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3,
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<{ embedding: number[]; tokenCount?: number }> {
  const result = await generateEmbeddingWithWakeup(text, 'e5', maxRetries);
  return {
    embedding: result.embedding,
    tokenCount: result.tokenCount
  };
}

// Batch retry wrapper for specific model
export async function generateBatchEmbeddingsWithRetry(
  texts: string[],
  model: EmbeddingModel = 'e5',
  maxRetries: number = 3,
  timeout: number = BACKGROUND_API_TIMEOUT
): Promise<{ embeddings: number[][]; tokenCounts?: number[]; model: string; dimensions: number }> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateBatchEmbeddings(texts, model, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff: wait 2^attempt seconds
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Enhanced dual batch retry wrapper with wake-up logic
export async function generateDualBatchEmbeddingsWithRetry(
  texts: string[],
  maxRetries: number = 3,
  timeout: number = BACKGROUND_API_TIMEOUT
): Promise<{
  e5_embeddings?: number[][];
  bge_embeddings?: number[][];
  e5_token_counts?: number[];
  bge_token_counts?: number[];
  success_count: number;
  e5_success: boolean;
  bge_success: boolean;
}> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Pre-warm servers on first attempt if needed
      if (attempt === 1) {
        console.log('Pre-warming servers for batch processing...');
        await preWarmEmbeddingServers();
      }
      
      return await generateDualBatchEmbeddings(texts, timeout);
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Check if this is a server sleeping issue
      if (isServerSleeping(lastError.message) && attempt < maxRetries) {
        console.log(`Batch embedding failed due to sleeping servers, attempt ${attempt}/${maxRetries}`);
        // Wait longer for batch operations
        const waitTime = WARMUP_RETRY_DELAYS[attempt - 1] || 60000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff for other errors
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Utility function to validate embedding vector
export function validateEmbedding(
  embedding: number[], 
  expectedDimension: number = 384,
  model?: EmbeddingModel
): boolean {
  if (!Array.isArray(embedding)) {
    return false;
  }
  
  // Use model-specific dimension if provided
  const dimension = model ? EMBEDDING_MODELS[model].dimensions : expectedDimension;
  
  if (embedding.length !== dimension) {
    return false;
  }
  
  // Check if all values are finite numbers
  return embedding.every(value => typeof value === 'number' && isFinite(value));
}

// Validate dual embedding response
export function validateDualEmbedding(response: DualEmbeddingResponse): {
  e5Valid: boolean;
  bgeValid: boolean;
  hasAnyValid: boolean;
} {
  const e5Valid = response.e5_embedding ? 
    validateEmbedding(response.e5_embedding, 384, 'e5') : false;
  const bgeValid = response.bge_embedding ? 
    validateEmbedding(response.bge_embedding, 1024, 'bge') : false;
  
  return {
    e5Valid,
    bgeValid,
    hasAnyValid: e5Valid || bgeValid
  };
}

// Utility function to calculate cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Text preprocessing utility
export function preprocessTextForEmbedding(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[\r\n]+/g, ' ') // Replace newlines with space
    .substring(0, 8000); // Limit text length to prevent API issues
}

// Utility to pre-warm embedding servers (call this in background)
export async function preWarmEmbeddingServers(): Promise<{
  e5_warmed: boolean;
  bge_warmed: boolean;
  total_time_ms: number;
}> {
  const startTime = Date.now();
  console.log('Pre-warming embedding servers...');
  
  const [e5Result, bgeResult] = await Promise.allSettled([
    wakeUpServer(E5_EMBEDDING_SERVER_URL, 'e5'),
    wakeUpServer(BGE_EMBEDDING_SERVER_URL, 'bge')
  ]);
  
  const result = {
    e5_warmed: e5Result.status === 'fulfilled' && e5Result.value,
    bge_warmed: bgeResult.status === 'fulfilled' && bgeResult.value,
    total_time_ms: Date.now() - startTime
  };
  
  console.log('Pre-warming completed:', result);
  return result;
}
