# Model Compatibility Guide

## Critical: Client-Server Model Alignment

### Problem Identified
The original tasks.md suggested using `Xenova/all-MiniLM-L6-v2` for client-side embedding generation. However, the server-side video processing pipeline uses `intfloat/multilingual-e5-small` for generating embeddings when tutors upload videos.

**Using different models would cause incompatible embedding spaces**, resulting in poor search results because:
- Client embeddings from `all-MiniLM-L6-v2` cannot be compared with server embeddings from `multilingual-e5-small`
- The cosine similarity scores would be meaningless
- Search results would be random or irrelevant

### Solution
Use **`Xenova/multilingual-e5-small`** on the client side, which is the ONNX-converted version of `intfloat/multilingual-e5-small`.

## Model Mapping

| Environment | Model Name | Format | Dimensions | Purpose |
|-------------|-----------|--------|------------|---------|
| Server (Video Upload) | `intfloat/multilingual-e5-small` | PyTorch | 384 | Generate embeddings for video segments |
| Server (Query - E5) | `intfloat/multilingual-e5-small` | PyTorch | 384 | Generate query embeddings for search |
| Server (Query - BGE) | `BAAI/bge-m3` | PyTorch | 1024 | Reranking embeddings |
| **Client (Fast Mode)** | **`Xenova/multilingual-e5-small`** | **ONNX** | **384** | **Generate query embeddings client-side** |
| **Client (Thinking Mode)** | **`Xenova/multilingual-e5-small`** | **ONNX** | **384** | **Generate E5 embeddings client-side** |

## Why Xenova/multilingual-e5-small?

1. **Same Embedding Space**: `Xenova/multilingual-e5-small` is the ONNX conversion of `intfloat/multilingual-e5-small`, producing identical embeddings
2. **Browser Compatible**: ONNX format works with Transformers.js in browsers
3. **Multilingual Support**: Supports the same languages as the server model
4. **Proven Compatibility**: Official Xenova conversion maintained by Hugging Face

## Model Specifications

### Xenova/multilingual-e5-small
- **Hugging Face URL**: https://huggingface.co/Xenova/multilingual-e5-small
- **Original Model**: https://huggingface.co/intfloat/multilingual-e5-small
- **Embedding Dimension**: 384
- **Model Size**: 
  - fp32: ~118MB
  - fp16: ~59MB
  - q8: ~25MB (recommended)
  - q4: ~15MB
- **Languages**: 100+ languages (multilingual)
- **Architecture**: BERT-based encoder

## Implementation Example

```typescript
import { pipeline } from "@huggingface/transformers";

// Initialize the model (matches server-side intfloat/multilingual-e5-small)
const extractor = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
  { 
    device: "webgpu",  // Use GPU acceleration if available
    dtype: "q8"        // 8-bit quantization for optimal size/performance
  }
);

// Generate embeddings (same as server-side)
const texts = ["用户的问题"];
const embeddings = await extractor(texts, { 
  pooling: "mean",      // Mean pooling (same as server)
  normalize: true       // L2 normalization (same as server)
});

// Result: 384-dimensional embedding compatible with server embeddings
console.log(embeddings.tolist()); // [[0.123, -0.456, ...]] (384 values)
```

## Verification Steps

To ensure client and server embeddings are compatible:

1. **Generate test embedding on server**:
   ```python
   from sentence_transformers import SentenceTransformer
   model = SentenceTransformer('intfloat/multilingual-e5-small')
   server_embedding = model.encode("test query")
   ```

2. **Generate test embedding on client**:
   ```typescript
   const extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");
   const client_embedding = await extractor("test query", { pooling: "mean", normalize: true });
   ```

3. **Compare embeddings**:
   - Both should have 384 dimensions
   - Cosine similarity should be ~0.99-1.0 (accounting for floating point precision)
   - If similarity < 0.95, there's a configuration mismatch

## Performance Characteristics

### Model Loading (First Time)
- **Download Size**: ~25MB (q8 quantization)
- **Download Time**: 5-15 seconds (depending on connection)
- **Initialization**: 1-3 seconds

### Embedding Generation
- **WebGPU**: 50-100ms per query
- **WASM**: 150-300ms per query
- **Batch (10 texts)**: 200-500ms (WebGPU)

### Caching
- **Browser Cache**: Model cached for 30 days
- **IndexedDB**: Embeddings cached for 7 days
- **Subsequent loads**: <100ms

## Migration Notes

### Changes Made to Spec
1. ✅ Updated Task 1.2: Changed model from `Xenova/all-MiniLM-L6-v2` to `Xenova/multilingual-e5-small`
2. ✅ Updated Task 2.2: Changed model reference in Fast Mode implementation
3. ✅ Updated Requirements: Changed model in Requirement 1 and Requirement 5
4. ✅ Updated Glossary: Changed Xenova_MiniLM to Xenova_E5_Small

### No Code Changes Required Yet
- This is a specification update
- Implementation will use the correct model from the start
- No migration of existing embeddings needed (client-side embeddings are not stored long-term)

## Alternative Models (NOT Recommended)

| Model | Why NOT to Use |
|-------|----------------|
| `Xenova/all-MiniLM-L6-v2` | Different embedding space, incompatible with server |
| `mixedbread-ai/mxbai-embed-xsmall-v1` | Different embedding space, incompatible with server |
| `Supabase/gte-small` | Different embedding space, incompatible with server |
| `Xenova/e5-small-v2` | English-only, server uses multilingual version |

## References

- [Xenova/multilingual-e5-small on Hugging Face](https://huggingface.co/Xenova/multilingual-e5-small)
- [intfloat/multilingual-e5-small (Original)](https://huggingface.co/intfloat/multilingual-e5-small)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [E5 Paper: Text Embeddings by Weakly-Supervised Contrastive Pre-training](https://arxiv.org/abs/2212.03533)
