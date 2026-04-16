# Client-Side Embedding Generation

This module provides browser-based embedding generation using Transformers.js with WebGPU/WASM acceleration and IndexedDB caching.

## Features

- **Client-side embedding generation** using Transformers.js
- **WebGPU acceleration** with automatic fallback to WASM
- **IndexedDB caching** with 7-day expiration
- **Compatible embeddings** with server-side model (384 dimensions)
- **Progressive enhancement** with feature detection
- **TypeScript support** with full type definitions

## Model Compatibility

- **Client-side**: `Xenova/multilingual-e5-small` (ONNX, 384-dim)
- **Server-side**: `intfloat/multilingual-e5-small` (384-dim)
- Both models produce compatible embeddings in the same vector space

## Installation

The required package should be installed:

```bash
npm install @huggingface/transformers
```

## Basic Usage

```typescript
import { generateClientEmbedding, initializeModel } from '@/lib/client-embedding';

// Initialize model (optional, will auto-initialize on first use)
await initializeModel({
  onProgress: (progress) => {
    console.log(`Loading: ${progress.progress}%`);
  }
});

// Generate embedding
const result = await generateClientEmbedding('Hello world');
console.log(result.embedding); // 384-dimensional vector
console.log(result.backend); // 'webgpu' or 'wasm'
console.log(result.cached); // true if from cache
console.log(result.generationTimeMs); // Time taken
```

## Feature Detection

```typescript
import { detectFeatures, isFastModeSupported, getRecommendedMode } from '@/lib/client-embedding';

// Detect all features
const features = await detectFeatures();
console.log(features.webgpu); // true if WebGPU available
console.log(features.wasm); // true if WASM available
console.log(features.indexedDB); // true if IndexedDB available
console.log(features.isMobile); // true if mobile device

// Check if Fast mode should be enabled
const canUseFastMode = await isFastModeSupported();

// Get recommended mode for this device
const mode = await getRecommendedMode(); // 'fast' | 'normal' | 'thinking'
```

## Cache Management

```typescript
import { getCachedEmbedding, setCachedEmbedding, getCacheStats, clearCache } from '@/lib/client-embedding';

// Get cache statistics
const stats = await getCacheStats();
console.log(`Cache: ${stats.totalEntries} entries, ${stats.totalSizeMB.toFixed(2)} MB`);

// Clear cache
await clearCache();
```

## Batch Generation

```typescript
import { generateClientEmbeddingBatch } from '@/lib/client-embedding';

const texts = ['Hello', 'World', 'Test'];
const result = await generateClientEmbeddingBatch(texts);
console.log(result.embeddings); // Array of 384-dim vectors
console.log(result.generationTimeMs); // Total time
```

## Configuration

```typescript
import { generateClientEmbedding } from '@/lib/client-embedding';

const result = await generateClientEmbedding('Hello', {
  modelName: 'Xenova/multilingual-e5-small', // Model to use
  backend: 'webgpu', // Force specific backend
  quantization: 'q8', // Quantization level
  enableCache: true, // Enable caching (default: true)
  onProgress: (progress) => {
    // Progress callback for model loading
    console.log(progress);
  }
});
```

## Performance

- **WebGPU**: 50-100ms per embedding
- **WASM**: 150-300ms per embedding
- **Model size**: ~25MB (q8 quantization)
- **Cache hit**: <10ms

## Browser Support

- **Chrome/Edge**: Full support (WebGPU + WASM)
- **Firefox**: WASM only (WebGPU experimental)
- **Safari**: WASM only
- **Mobile**: WASM support varies

## Architecture

```
┌─────────────────────────────────────────┐
│  Application Layer                      │
│  (React components, hooks)              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Client Embedding Module                │
│  ┌─────────────────────────────────┐   │
│  │  embedding-service.ts           │   │
│  │  - Model initialization         │   │
│  │  - Embedding generation         │   │
│  │  - Backend detection            │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  embedding-cache.ts             │   │
│  │  - IndexedDB storage            │   │
│  │  - Cache management             │   │
│  │  - Expiration handling          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  feature-detection.ts           │   │
│  │  - WebGPU detection             │   │
│  │  - WASM detection               │   │
│  │  - Device capabilities          │   │
│  └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Transformers.js                        │
│  - Model loading (ONNX)                 │
│  - WebGPU/WASM backend                  │
│  - Feature extraction pipeline          │
└─────────────────────────────────────────┘
```

## Error Handling

```typescript
import { generateClientEmbedding } from '@/lib/client-embedding';

try {
  const result = await generateClientEmbedding('Hello');
  console.log(result.embedding);
} catch (error) {
  if (error.message.includes('Model not initialized')) {
    // Handle initialization error
    console.error('Failed to initialize model');
  } else if (error.message.includes('Invalid embedding dimension')) {
    // Handle dimension mismatch
    console.error('Embedding dimension mismatch');
  } else {
    // Handle other errors
    console.error('Embedding generation failed:', error);
  }
}
```

## Next Steps

1. Install the package: `npm install @huggingface/transformers`
2. Import and use in your components
3. Add UI components for model loading progress
4. Integrate with video AI assistant hooks
5. Add mode selector UI for Fast/Normal/Thinking modes
