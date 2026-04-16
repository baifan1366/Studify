/**
 * Client-side embedding generation service using Transformers.js
 * 
 * This service generates embeddings in the browser using WebGPU or WASM backend.
 * It uses the Xenova/multilingual-e5-small model which is compatible with the
 * server-side intfloat/multilingual-e5-small model (both produce 384-dim embeddings).
 */

import type {
  EmbeddingBackend,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingServiceConfig,
  ModelLoadProgress,
} from './types';

// Model configuration
const DEFAULT_MODEL = 'Xenova/multilingual-e5-small';
const DEFAULT_QUANTIZATION = 'q8';
const EMBEDDING_DIMENSION = 384;

// Global state
let modelInstance: any = null;
let currentBackend: EmbeddingBackend | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Detect the best available backend for embedding generation
 * Priority: WebGPU > WASM > CPU
 */
export async function detectBackend(): Promise<EmbeddingBackend> {
  // Check WebGPU support
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (adapter) {
        console.log('[EmbeddingService] WebGPU is available');
        return 'webgpu';
      }
    } catch (error) {
      console.warn('[EmbeddingService] WebGPU detection failed:', error);
    }
  }

  // Check WASM support
  if (typeof WebAssembly !== 'undefined') {
    console.log('[EmbeddingService] WASM is available');
    return 'wasm';
  }

  // Fallback to CPU
  console.log('[EmbeddingService] Falling back to CPU');
  return 'cpu';
}

/**
 * Initialize the embedding model
 * This will download the model on first use (~25MB with q8 quantization)
 */
export async function initializeModel(
  config: EmbeddingServiceConfig = {}
): Promise<void> {
  // If already initialized, return immediately
  if (modelInstance && !isInitializing) {
    return;
  }

  // If currently initializing, wait for that to complete
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  const startTime = Date.now();

  initializationPromise = (async () => {
    try {
      const {
        modelName = DEFAULT_MODEL,
        backend,
        quantization = DEFAULT_QUANTIZATION,
        onProgress,
      } = config;

      // Notify start
      onProgress?.({
        status: 'downloading',
        progress: 0,
      });

      // Detect backend if not specified
      const selectedBackend = backend || (await detectBackend());
      currentBackend = selectedBackend;

      console.log(`[EmbeddingService] Initializing model: ${modelName}`);
      console.log(`[EmbeddingService] Backend: ${selectedBackend}`);
      console.log(`[EmbeddingService] Quantization: ${quantization}`);

      // Dynamic import to avoid SSR issues
      const { pipeline } = await import('@huggingface/transformers');

      // Create the feature extraction pipeline
      // Note: This will download the model on first use
      // According to Transformers.js v3 docs, device and dtype are passed in the config object
      modelInstance = await pipeline('feature-extraction', modelName, {
        device: selectedBackend,
        dtype: quantization,
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.total) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            onProgress?.({
              status: 'downloading',
              progress: percentage,
              loaded: progress.loaded,
              total: progress.total,
            });
          } else if (progress.status === 'initiate') {
            onProgress?.({
              status: 'downloading',
              progress: 0,
            });
          }
        },
      });

      const loadTime = Date.now() - startTime;
      console.log(`[EmbeddingService] Model initialized in ${loadTime}ms`);

      onProgress?.({
        status: 'ready',
        progress: 100,
      });
    } catch (error) {
      console.error('[EmbeddingService] Model initialization failed:', error);
      // Use config.onProgress directly since onProgress is out of scope here
      config.onProgress?.({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
}

/**
 * Generate embedding for a single text
 * 
 * @param text - Input text to generate embedding for
 * @param config - Optional configuration
 * @returns Embedding result with 384-dimensional vector
 */
export async function generateClientEmbedding(
  text: string,
  config: EmbeddingServiceConfig = {}
): Promise<EmbeddingResult> {
  const startTime = Date.now();

  try {
    // Check cache first if enabled
    if (config.enableCache !== false) {
      const { getCachedEmbedding } = await import('./embedding-cache');
      const cachedEmbedding = await getCachedEmbedding(text);
      
      if (cachedEmbedding) {
        const generationTimeMs = Date.now() - startTime;
        console.log('[EmbeddingService] Using cached embedding');
        return {
          embedding: cachedEmbedding,
          model: DEFAULT_MODEL,
          backend: currentBackend || 'cpu',
          cached: true,
          generationTimeMs,
        };
      }
    }

    // Initialize model if needed
    if (!modelInstance) {
      await initializeModel(config);
    }

    if (!modelInstance) {
      throw new Error('Model not initialized');
    }

    // Generate embedding
    const output = await modelInstance(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract the embedding array
    const embedding: number[] = Array.from(output.data as ArrayLike<number>);

    // Validate dimension
    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`
      );
    }

    // Cache the result if enabled
    if (config.enableCache !== false) {
      const { setCachedEmbedding } = await import('./embedding-cache');
      setCachedEmbedding(text, embedding).catch((error) => {
        console.warn('[EmbeddingService] Failed to cache embedding:', error);
      });
    }

    const generationTimeMs = Date.now() - startTime;

    return {
      embedding,
      model: DEFAULT_MODEL,
      backend: currentBackend || 'cpu',
      cached: false,
      generationTimeMs,
    };
  } catch (error) {
    console.error('[EmbeddingService] Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * @param texts - Array of input texts
 * @param config - Optional configuration
 * @returns Batch embedding result
 */
export async function generateClientEmbeddingBatch(
  texts: string[],
  config: EmbeddingServiceConfig = {}
): Promise<BatchEmbeddingResult> {
  const startTime = Date.now();

  try {
    // Initialize model if needed
    if (!modelInstance) {
      await initializeModel(config);
    }

    if (!modelInstance) {
      throw new Error('Model not initialized');
    }

    // Generate embeddings for all texts
    const output = await modelInstance(texts, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract embeddings
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const embeddingData = output[i].data;
      const embedding: number[] = Array.from(embeddingData as ArrayLike<number>);
      
      if (embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `Invalid embedding dimension at index ${i}: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`
        );
      }
      
      embeddings.push(embedding);
    }

    const generationTimeMs = Date.now() - startTime;

    return {
      embeddings,
      model: DEFAULT_MODEL,
      backend: currentBackend || 'cpu',
      cached: new Array(texts.length).fill(false),
      generationTimeMs,
    };
  } catch (error) {
    console.error('[EmbeddingService] Batch embedding generation failed:', error);
    throw error;
  }
}

/**
 * Get current backend being used
 */
export function getCurrentBackend(): EmbeddingBackend | null {
  return currentBackend;
}

/**
 * Check if model is initialized
 */
export function isModelInitialized(): boolean {
  return modelInstance !== null && !isInitializing;
}

/**
 * Reset the model instance (useful for testing or switching models)
 */
export function resetModel(): void {
  modelInstance = null;
  currentBackend = null;
  isInitializing = false;
  initializationPromise = null;
  console.log('[EmbeddingService] Model reset');
}
