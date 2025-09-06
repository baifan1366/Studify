// Embedding server URL
const EMBEDDING_SERVER_URL = "https://embedding-server-jxsa.onrender.com";

// 设置超时时间（毫秒）
const DEFAULT_API_TIMEOUT = 30000; // 30秒超时
const BACKGROUND_API_TIMEOUT = 120000; // 120秒超时，用于后台处理

// Types for embedding API
interface EmbeddingRequest {
  input: string;
}

interface BatchRequest {
  inputs: string[];
}

interface EmbeddingResponse {
  embedding: number[];
  token_count?: number;
}

interface BatchEmbeddingResponse {
  embeddings: number[][];
  token_counts?: number[];
}

interface EmbeddingError {
  error: string;
  details?: string;
}

// Utility function to create fetch with timeout
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

// Single embedding function
export async function generateEmbedding(text: string): Promise<{
  embedding: number[];
  tokenCount?: number;
}> {
  try {
    const processedText = preprocessTextForEmbedding(text);
    
    if (!processedText) {
      throw new Error('Text preprocessing resulted in empty content');
    }

    // Check cache first
    const { getCachedEmbedding, setCachedEmbedding } = await import('./embedding-cache');
    const cachedEmbedding = getCachedEmbedding(processedText);
    if (cachedEmbedding) {
      return { embedding: cachedEmbedding };
    }

    const requestBody: EmbeddingRequest = {
      input: processedText
    };

    const response = await fetchWithTimeout(
      `${EMBEDDING_SERVER_URL}/embed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      DEFAULT_API_TIMEOUT
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Embedding API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data: EmbeddingResponse = await response.json();
    
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding response format');
    }

    const embeddingResult = {
      embedding: data.embedding,
      tokenCount: data.token_count
    };

    // Cache the result
    setCachedEmbedding(processedText, embeddingResult.embedding);
    
    return embeddingResult;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
    throw new Error('Failed to generate embedding: Unknown error');
  }
}

// Batch embedding function
export async function generateBatchEmbeddings(
  texts: string[],
  timeout: number = BACKGROUND_API_TIMEOUT
): Promise<{ embeddings: number[][]; tokenCounts?: number[] }> {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
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
      `${EMBEDDING_SERVER_URL}/embed/batch`,
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
      throw new Error(`Batch embedding API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data: BatchEmbeddingResponse = await response.json();
    
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('Invalid batch embedding response format');
    }

    return {
      embeddings: data.embeddings,
      tokenCounts: data.token_counts
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
    throw new Error('Failed to generate batch embeddings: Unknown error');
  }
}

// Retry wrapper for embedding generation
export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3,
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<{ embedding: number[]; tokenCount?: number }> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateEmbedding(text);
      return result;
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

// Batch retry wrapper
export async function generateBatchEmbeddingsWithRetry(
  texts: string[],
  maxRetries: number = 3,
  timeout: number = BACKGROUND_API_TIMEOUT
): Promise<{ embeddings: number[][]; tokenCounts?: number[] }> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateBatchEmbeddings(texts, timeout);
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

// Utility function to validate embedding vector
export function validateEmbedding(embedding: number[], expectedDimension: number = 384): boolean {
  if (!Array.isArray(embedding)) {
    return false;
  }
  
  if (embedding.length !== expectedDimension) {
    return false;
  }
  
  // Check if all values are finite numbers
  return embedding.every(value => typeof value === 'number' && isFinite(value));
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
