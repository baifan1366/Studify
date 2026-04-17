/**
 * Client-side embedding generation module
 * 
 * This module provides browser-based embedding generation using Transformers.js
 * with WebGPU/WASM acceleration and IndexedDB caching.
 */

// Export types
export type {
  EmbeddingBackend,
  QuantizationType,
  ModelLoadProgress,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingServiceConfig,
  FeatureSupport,
} from './types';

// Export embedding service functions
export {
  detectBackend,
  initializeModel,
  generateClientEmbedding,
  generateClientEmbeddingBatch,
  getCurrentBackend,
  isModelInitialized,
  resetModel,
} from './embedding-service';

// Export cache functions
export {
  getCachedEmbedding,
  setCachedEmbedding,
  getCacheStats,
  clearCache,
} from './embedding-cache';

// Export feature detection functions
export {
  detectWebGPU,
  detectWASM,
  detectIndexedDB,
  getDeviceMemory,
  isMobileDevice,
  detectFeatures,
  isFastModeSupported,
  isCachingSupported,
  getRecommendedMode,
  isModeSupported,
  getModeCapabilityWarnings,
  clearFeatureCache,
} from './feature-detection';
