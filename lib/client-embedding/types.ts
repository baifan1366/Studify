/**
 * Client-side embedding generation types for Transformers.js
 */

/**
 * Supported backend types for embedding generation
 */
export type EmbeddingBackend = 'webgpu' | 'wasm' | 'cpu';

/**
 * Quantization options for model loading
 */
export type QuantizationType = 'q4' | 'q8' | 'fp16' | 'fp32';

/**
 * Model initialization progress callback
 */
export interface ModelLoadProgress {
  /** Current loading status */
  status: 'downloading' | 'loading' | 'ready' | 'error';
  /** Progress percentage (0-100) */
  progress: number;
  /** Downloaded bytes */
  loaded?: number;
  /** Total bytes */
  total?: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  /** The embedding vector (384 dimensions for E5-small) */
  embedding: number[];
  /** Model name used */
  model: string;
  /** Backend used (webgpu, wasm, cpu) */
  backend: EmbeddingBackend;
  /** Whether result was from cache */
  cached: boolean;
  /** Generation time in milliseconds */
  generationTimeMs: number;
}

/**
 * Batch embedding generation result
 */
export interface BatchEmbeddingResult {
  /** Array of embedding vectors */
  embeddings: number[][];
  /** Model name used */
  model: string;
  /** Backend used */
  backend: EmbeddingBackend;
  /** Whether results were from cache */
  cached: boolean[];
  /** Total generation time in milliseconds */
  generationTimeMs: number;
}

/**
 * Client embedding service configuration
 */
export interface EmbeddingServiceConfig {
  /** Model name (default: Xenova/multilingual-e5-small) */
  modelName?: string;
  /** Preferred backend (default: auto-detect) */
  backend?: EmbeddingBackend;
  /** Quantization type (default: q8) */
  quantization?: QuantizationType;
  /** Enable caching (default: true) */
  enableCache?: boolean;
  /** Progress callback for model loading */
  onProgress?: (progress: ModelLoadProgress) => void;
}

/**
 * Feature detection result
 */
export interface FeatureSupport {
  /** WebGPU is available */
  webgpu: boolean;
  /** WebAssembly is available */
  wasm: boolean;
  /** IndexedDB is available */
  indexedDB: boolean;
  /** Device memory in GB (if available) */
  deviceMemory?: number;
  /** Is mobile device */
  isMobile: boolean;
}
