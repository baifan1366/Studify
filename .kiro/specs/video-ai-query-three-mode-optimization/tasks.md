# Implementation Tasks

## Phase 1: Client-Side Embedding Infrastructure

### Task 1.1: Setup Transformers.js Dependencies
**Status:** pending
**Priority:** high
**Estimated Effort:** 2 hours

**Description:**
Install and configure Transformers.js library with WebGPU support for client-side embedding generation.

**Acceptance Criteria:**
- [ ] Install `@huggingface/transformers` package (latest stable version - replaces deprecated @xenova/transformers)
- [ ] Configure next.config.js to handle WASM files and enable WebGPU
- [ ] Add TypeScript type definitions for Transformers.js
- [ ] Verify package installation and imports work correctly
- [ ] Test WebGPU availability detection

**Installation Command:**
```bash
npm install @huggingface/transformers
```

**Files to Modify:**
- `package.json`
- `next.config.js`
- `tsconfig.json`

**Dependencies:** None

**Notes:**
- The package name is `@huggingface/transformers` (NOT `@xenova/transformers`)
- Supports WebGPU via `{ device: "webgpu" }` option
- Supports quantization via `{ dtype: "q4" | "q8" | "fp16" | "fp32" }` option

---

### Task 1.2: Create Client Embedding Service Module
**Status:** pending
**Priority:** high
**Estimated Effort:** 4 hours

**Description:**
Create a new service module for client-side embedding generation with WebGPU/WASM backend detection and model loading.

**Acceptance Criteria:**
- [ ] Create `lib/client-embedding/embedding-service.ts`
- [ ] Implement `initializeModel()` function with progress callback
- [ ] Implement `detectBackend()` function (WebGPU > WASM)
- [ ] Implement `generateClientEmbedding(text: string)` function using pipeline API
- [ ] Implement `generateClientEmbeddingBatch(texts: string[])` function
- [ ] **CRITICAL**: Use `Xenova/multilingual-e5-small` to match server-side model (`intfloat/multilingual-e5-small`)
- [ ] Configure quantization: `{ dtype: "q8" }` for optimal size/performance balance
- [ ] Add proper error handling and retry logic
- [ ] Export TypeScript interfaces and types

**Example Implementation:**
```typescript
import { pipeline } from "@huggingface/transformers";

// IMPORTANT: Use Xenova/multilingual-e5-small to match server-side intfloat/multilingual-e5-small
const extractor = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
  { device: "webgpu", dtype: "q8" }
);

const embeddings = await extractor(texts, { 
  pooling: "mean", 
  normalize: true 
});
```

**Model Compatibility Note:**
- Server-side uses: `intfloat/multilingual-e5-small` (384-dim)
- Client-side must use: `Xenova/multilingual-e5-small` (ONNX version, 384-dim)
- These models produce compatible embeddings in the same vector space
- DO NOT use `Xenova/all-MiniLM-L6-v2` - it has a different embedding space!

**Files to Create:**
- `lib/client-embedding/embedding-service.ts`
- `lib/client-embedding/types.ts`

**Dependencies:** Task 1.1

---

### Task 1.3: Implement Client-Side Embedding Cache
**Status:** pending
**Priority:** high
**Estimated Effort:** 3 hours

**Description:**
Create IndexedDB-based caching layer for client-generated embeddings with 7-day expiration.

**Acceptance Criteria:**
- [ ] Create `lib/client-embedding/embedding-cache.ts`
- [ ] Implement IndexedDB initialization with schema
- [ ] Implement `getCachedEmbedding(key: string)` function
- [ ] Implement `setCachedEmbedding(key: string, embedding: number[])` function
- [ ] Implement automatic expiration (7 days)
- [ ] Implement cache size management (max 100MB)
- [ ] Add cache statistics tracking (hit rate, size)

**Files to Create:**
- `lib/client-embedding/embedding-cache.ts`

**Dependencies:** Task 1.2

---

### Task 1.4: Create Model Loading UI Component
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Create a reusable component to display model download progress and status.

**Acceptance Criteria:**
- [ ] Create `components/ai/model-loading-indicator.tsx`
- [ ] Display download progress (percentage and MB)
- [ ] Show loading spinner during initialization
- [ ] Display error messages if loading fails
- [ ] Support i18n for all text
- [ ] Add smooth animations for progress updates

**Files to Create:**
- `components/ai/model-loading-indicator.tsx`

**Dependencies:** Task 1.2

---

## Phase 2: Fast Mode Implementation

### Task 2.1: Update Mode Selector UI to Include Normal Mode
**Status:** pending
**Priority:** high
**Estimated Effort:** 2 hours

**Description:**
Update the existing mode selector in both components to include Normal mode alongside Fast and Thinking modes.

**Acceptance Criteria:**
- [ ] Add Normal mode button to video-qa-panel.tsx mode selector
- [ ] Add Normal mode button to video-ai-assistant.tsx mode selector
- [ ] Update mode state type to include 'normal': `'fast' | 'normal' | 'thinking'`
- [ ] Add appropriate icon/emoji for Normal mode (⚙️ or 🎯)
- [ ] Update tooltips to describe all three modes
- [ ] Ensure visual consistency across both components

**Files to Modify:**
- `components/video/video-qa-panel.tsx`
- `components/course/video-ai-assistant.tsx`

**Dependencies:** None

---

### Task 2.2: Implement Fast Mode Client Embedding Generation
**Status:** pending
**Priority:** high
**Estimated Effort:** 4 hours

**Description:**
Integrate client-side embedding generation into the query flow for Fast mode.

**Acceptance Criteria:**
- [ ] Detect when Fast mode is selected
- [ ] Initialize Transformers.js model on first Fast mode use
- [ ] **Generate embedding client-side using `Xenova/multilingual-e5-small` with q8 quantization**
- [ ] Use pipeline API: `pipeline("feature-extraction", "Xenova/multilingual-e5-small", { device: "webgpu", dtype: "q8" })`
- [ ] Apply pooling and normalization: `{ pooling: "mean", normalize: true }`
- [ ] Check cache before generating new embedding
- [ ] Display model loading indicator during first load
- [ ] Handle errors and fallback to Normal mode if needed
- [ ] Log performance metrics (embedding generation time)

**Technical Notes:**
- Use `@huggingface/transformers` pipeline API (v3+)
- **CRITICAL**: Must use `Xenova/multilingual-e5-small` to match server-side `intfloat/multilingual-e5-small`
- Quantization options: `q4` (smallest), `q8` (recommended), `fp16`, `fp32` (highest quality)
- WebGPU provides 5-10x speedup over WASM
- Model size with q8: ~25MB (acceptable for browser download)

**Files to Modify:**
- `hooks/video/use-video-qa.ts` (or create new hook)
- `hooks/course/use-video-ai.ts`

**Dependencies:** Task 1.2, Task 1.3, Task 1.4

---

### Task 2.3: Create Fast Mode Search API Endpoint
**Status:** pending
**Priority:** high
**Estimated Effort:** 3 hours

**Description:**
Create or modify API endpoint to accept client-generated embeddings for Fast mode queries.

**Acceptance Criteria:**
- [ ] Accept `clientEmbedding` parameter in request body
- [ ] Skip server-side embedding generation when clientEmbedding provided
- [ ] Use E5-only search strategy (no BGE reranking)
- [ ] Adjust similarity threshold to 0.45 for Fast mode
- [ ] Return top 15 results instead of top 10
- [ ] Include performance metrics in response
- [ ] Validate embedding dimensions (384)

**Files to Modify:**
- `app/api/ai/video-assistant/route.ts`
- `lib/langChain/tools/search-tool.ts`

**Dependencies:** Task 2.2

---

### Task 2.4: Optimize E5-Only Search Strategy
**Status:** pending
**Priority:** medium
**Estimated Effort:** 3 hours

**Description:**
Optimize the search strategy for Fast mode to maintain answer quality without BGE reranking.

**Acceptance Criteria:**
- [ ] Create new database function `search_video_embeddings_e5_fast`
- [ ] Implement time-window prioritization (currentTime ± 180s)
- [ ] Implement automatic fallback to full video search
- [ ] Adjust scoring algorithm for E5-only results
- [ ] Add metadata flag `fromTimeWindow` to results
- [ ] Test and validate answer quality (target: 70% of Normal mode)

**Files to Modify:**
- `db/function.sql`
- `lib/langChain/tools/search-tool.ts`

**Dependencies:** Task 2.3

---

## Phase 3: Normal Mode Implementation

### Task 3.1: Ensure Normal Mode Uses Dual Embedding
**Status:** pending
**Priority:** high
**Estimated Effort:** 2 hours

**Description:**
Verify and ensure Normal mode properly uses the existing dual embedding (E5 + BGE) server-side flow.

**Acceptance Criteria:**
- [ ] Verify Normal mode triggers server-side E5 embedding generation
- [ ] Verify Normal mode triggers server-side BGE embedding generation
- [ ] Verify two-stage search is executed (E5 粗筛 + BGE 精排)
- [ ] Verify OPENROUTER_MODEL_THINKING model is used
- [ ] Verify thinking process is NOT displayed in Normal mode
- [ ] Add logging to confirm dual embedding flow

**Files to Modify:**
- `app/api/ai/video-assistant/route.ts`
- `lib/langChain/embedding.ts`

**Dependencies:** Task 2.1

---

### Task 3.2: Add Normal Mode Model Configuration
**Status:** pending
**Priority:** medium
**Estimated Effort:** 1 hour

**Description:**
Add environment variable configuration for Normal mode AI model selection.

**Acceptance Criteria:**
- [ ] Read OPENROUTER_MODEL_NORMAL from environment (if different from THINKING)
- [ ] Default to OPENROUTER_MODEL_THINKING if NORMAL not set
- [ ] Validate model configuration on startup
- [ ] Log model selection for Normal mode
- [ ] Update .env.example with new variable

**Files to Modify:**
- `app/api/ai/video-assistant/route.ts`
- `.env.example`

**Dependencies:** Task 3.1

---

## Phase 4: Thinking Mode Implementation

### Task 4.1: Implement Hybrid Embedding Strategy
**Status:** pending
**Priority:** high
**Estimated Effort:** 4 hours

**Description:**
Implement hybrid embedding strategy where E5 is generated client-side and BGE is generated server-side for Thinking mode.

**Acceptance Criteria:**
- [ ] Generate E5 embedding client-side in Thinking mode
- [ ] Send client E5 embedding to server
- [ ] Generate BGE embedding server-side only
- [ ] Use client E5 for initial search (top 30)
- [ ] Use server BGE for reranking (top 10)
- [ ] Handle HF server sleep gracefully
- [ ] Display server wake-up progress to user

**Files to Modify:**
- `hooks/video/use-video-qa.ts`
- `hooks/course/use-video-ai.ts`
- `app/api/ai/video-assistant/route.ts`
- `lib/langChain/tools/search-tool.ts`

**Dependencies:** Task 2.2, Task 1.2

---

### Task 4.2: Implement Thinking Process Streaming
**Status:** pending
**Priority:** high
**Estimated Effort:** 3 hours

**Description:**
Implement streaming of thinking process tokens from the AI model to the UI in real-time.

**Acceptance Criteria:**
- [ ] Enable thinking mode in OpenRouter API call
- [ ] Parse thinking tokens from streaming response
- [ ] Send thinking tokens via SSE to client
- [ ] Update UI to display thinking process incrementally
- [ ] Handle thinking process completion
- [ ] Add collapsible thinking process section in UI

**Files to Modify:**
- `app/api/ai/video-assistant/route.ts`
- `lib/langChain/tool-calling-integration.ts`
- `components/video/video-qa-panel.tsx`
- `components/course/video-ai-assistant.tsx`

**Dependencies:** Task 4.1

---

### Task 4.3: Add Thinking Process UI Component
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Create a reusable component for displaying the thinking process with proper styling and interaction.

**Acceptance Criteria:**
- [ ] Create collapsible thinking process section
- [ ] Use purple background and Brain icon
- [ ] Display thinking text in monospace font
- [ ] Preserve formatting (whitespace-pre-wrap)
- [ ] Show thinking duration when complete
- [ ] Support streaming updates (incremental display)
- [ ] Add i18n support for labels

**Files to Modify:**
- `components/video/video-qa-panel.tsx` (already has basic implementation)
- `components/course/video-ai-assistant.tsx` (already has basic implementation)

**Dependencies:** Task 4.2

---

## Phase 5: HuggingFace Server Sleep Handling

### Task 5.1: Enhance Server Wake-Up Logic
**Status:** pending
**Priority:** high
**Estimated Effort:** 3 hours

**Description:**
Improve the existing HF server wake-up logic to provide better user feedback and reliability.

**Acceptance Criteria:**
- [ ] Detect server sleep indicators more reliably
- [ ] Send parallel wake-up requests (GET /, /healthz, /embed)
- [ ] Display wake-up progress to user with estimated time
- [ ] Implement exponential backoff (30s, 60s, 120s)
- [ ] Log wake-up events and duration
- [ ] Provide fallback options if wake-up fails
- [ ] Add user-facing status messages

**Files to Modify:**
- `lib/langChain/embedding.ts`

**Dependencies:** None

---

### Task 5.2: Add Server Status Indicator UI
**Status:** pending
**Priority:** low
**Estimated Effort:** 2 hours

**Description:**
Create UI component to show HF server status and wake-up progress.

**Acceptance Criteria:**
- [ ] Create `components/ai/server-status-indicator.tsx`
- [ ] Display server status (active, sleeping, waking)
- [ ] Show wake-up progress with spinner
- [ ] Display estimated wake-up time
- [ ] Support dismissible notifications
- [ ] Add i18n support

**Files to Create:**
- `components/ai/server-status-indicator.tsx`

**Dependencies:** Task 5.1

---

## Phase 6: Caching Layer Implementation

### Task 6.1: Implement Server-Side Redis Cache
**Status:** pending
**Priority:** medium
**Estimated Effort:** 3 hours

**Description:**
Implement Redis-based caching for server-generated embeddings with 24-hour expiration.

**Acceptance Criteria:**
- [ ] Create `lib/cache/embedding-cache.ts` for server-side
- [ ] Implement Redis connection and error handling
- [ ] Implement `getCachedServerEmbedding(key: string)` function
- [ ] Implement `setCachedServerEmbedding(key: string, embedding)` function
- [ ] Set 24-hour TTL on cached embeddings
- [ ] Add cache statistics logging
- [ ] Handle Redis connection failures gracefully

**Files to Create:**
- `lib/cache/embedding-cache.ts`

**Dependencies:** None

---

### Task 6.2: Integrate Caching into Embedding Generation
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Integrate both client-side and server-side caching into the embedding generation flow.

**Acceptance Criteria:**
- [ ] Check client cache before generating client embedding
- [ ] Check server cache before generating server embedding
- [ ] Store successful embeddings in appropriate cache
- [ ] Log cache hit/miss events
- [ ] Track cache hit rate (every 10 queries)
- [ ] Add cache bypass option for debugging

**Files to Modify:**
- `lib/client-embedding/embedding-service.ts`
- `lib/langChain/embedding.ts`
- `app/api/ai/video-assistant/route.ts`

**Dependencies:** Task 1.3, Task 6.1

---

## Phase 7: Performance Monitoring

### Task 7.1: Implement Performance Metrics Collection
**Status:** pending
**Priority:** medium
**Estimated Effort:** 3 hours

**Description:**
Add comprehensive performance metrics collection for all three modes.

**Acceptance Criteria:**
- [ ] Track embedding generation time (client and server)
- [ ] Track database search time
- [ ] Track AI response generation time
- [ ] Track total query time
- [ ] Track cache hit/miss rates
- [ ] Track mode usage statistics
- [ ] Store metrics in structured format

**Files to Modify:**
- `app/api/ai/video-assistant/route.ts`
- `lib/client-embedding/embedding-service.ts`
- `lib/langChain/tools/search-tool.ts`

**Dependencies:** None

---

### Task 7.2: Create Performance Dashboard Component
**Status:** pending
**Priority:** low
**Estimated Effort:** 4 hours

**Description:**
Create an admin dashboard component to visualize performance metrics across all three modes.

**Acceptance Criteria:**
- [ ] Create `components/admin/ai/performance-dashboard.tsx`
- [ ] Display average response time per mode
- [ ] Display cache hit rates
- [ ] Display mode usage distribution
- [ ] Show performance trends over time
- [ ] Add export functionality for metrics
- [ ] Restrict access to admin users only

**Files to Create:**
- `components/admin/ai/performance-dashboard.tsx`
- `app/api/admin/ai-metrics/route.ts`

**Dependencies:** Task 7.1

---

## Phase 8: Error Handling and Fallbacks

### Task 8.1: Implement Comprehensive Error Handling
**Status:** pending
**Priority:** high
**Estimated Effort:** 3 hours

**Description:**
Add robust error handling with clear user feedback for all failure scenarios.

**Acceptance Criteria:**
- [ ] Handle model loading failures (fallback to Normal mode)
- [ ] Handle WebGPU initialization failures (fallback to WASM)
- [ ] Handle server embedding failures (retry with exponential backoff)
- [ ] Handle database search failures (display error and retry option)
- [ ] Distinguish network, server, and client errors
- [ ] Provide actionable error messages with solutions
- [ ] Log all errors with context for debugging

**Files to Modify:**
- `lib/client-embedding/embedding-service.ts`
- `app/api/ai/video-assistant/route.ts`
- `hooks/video/use-video-qa.ts`
- `hooks/course/use-video-ai.ts`

**Dependencies:** None

---

### Task 8.2: Add Error Recovery UI
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Create UI components for error display and recovery actions.

**Acceptance Criteria:**
- [ ] Create error toast notifications with retry button
- [ ] Add mode fallback suggestions in error messages
- [ ] Display "Switch to Normal mode" option on Fast mode failures
- [ ] Add "Refresh page" suggestion after 3 consecutive failures
- [ ] Support i18n for all error messages
- [ ] Add error reporting option (send to admin)

**Files to Modify:**
- `components/video/video-qa-panel.tsx`
- `components/course/video-ai-assistant.tsx`

**Dependencies:** Task 8.1

---

## Phase 9: Progressive Enhancement

### Task 9.1: Implement Feature Detection
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Add feature detection for WebGPU, WASM, and IndexedDB to enable progressive enhancement.

**Acceptance Criteria:**
- [ ] Create `lib/client-embedding/feature-detection.ts`
- [ ] Detect WebGPU availability
- [ ] Detect WASM availability
- [ ] Detect IndexedDB availability
- [ ] Detect device memory (<4GB)
- [ ] Detect mobile device
- [ ] Export feature flags for UI components

**Files to Create:**
- `lib/client-embedding/feature-detection.ts`

**Dependencies:** None

---

### Task 9.2: Implement Adaptive Mode Selection
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Automatically select the best mode based on device capabilities and user preferences.

**Acceptance Criteria:**
- [ ] Default to Normal mode on mobile devices
- [ ] Disable Fast mode if WebGPU and WASM unavailable
- [ ] Disable client caching if IndexedDB unavailable
- [ ] Show capability warnings in mode selector tooltips
- [ ] Add manual override option in settings
- [ ] Display current capabilities in settings page

**Files to Modify:**
- `components/video/video-qa-panel.tsx`
- `components/course/video-ai-assistant.tsx`

**Dependencies:** Task 9.1

---

## Phase 10: Internationalization

### Task 10.1: Add i18n Keys for New Features
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Add internationalization keys for all new UI text in English and Chinese.

**Acceptance Criteria:**
- [ ] Add mode names and descriptions (Fast, Normal, Thinking)
- [ ] Add error messages for all failure scenarios
- [ ] Add loading messages (model loading, server waking)
- [ ] Add performance metric labels
- [ ] Add tooltip text for mode selector
- [ ] Add thinking process labels
- [ ] Update both en.json and zh.json

**Files to Modify:**
- `messages/en.json`
- `messages/zh.json`

**Dependencies:** None

---

## Phase 11: Testing

### Task 11.1: Write Unit Tests for Client Embedding
**Status:** pending
**Priority:** high
**Estimated Effort:** 4 hours

**Description:**
Write comprehensive unit tests for client-side embedding generation logic.

**Acceptance Criteria:**
- [ ] Test model initialization and loading
- [ ] Test embedding generation with mock model
- [ ] Test cache hit/miss scenarios
- [ ] Test error handling and retries
- [ ] Test backend detection (WebGPU/WASM)
- [ ] Test batch embedding generation
- [ ] Achieve >80% code coverage

**Files to Create:**
- `lib/client-embedding/__tests__/embedding-service.test.ts`
- `lib/client-embedding/__tests__/embedding-cache.test.ts`

**Dependencies:** Task 1.2, Task 1.3

---

### Task 11.2: Write Integration Tests for Three Modes
**Status:** pending
**Priority:** high
**Estimated Effort:** 6 hours

**Description:**
Write end-to-end integration tests for all three query modes.

**Acceptance Criteria:**
- [ ] Test Fast mode complete flow (client embedding + E5 search)
- [ ] Test Normal mode complete flow (dual embedding + reranking)
- [ ] Test Thinking mode complete flow (hybrid + thinking display)
- [ ] Test mode switching during query
- [ ] Test error scenarios and fallbacks
- [ ] Test caching behavior
- [ ] Test performance targets (response times)

**Files to Create:**
- `__tests__/integration/video-ai-query-modes.test.ts`

**Dependencies:** All implementation tasks

---

### Task 11.3: Perform Browser Compatibility Testing
**Status:** pending
**Priority:** medium
**Estimated Effort:** 4 hours

**Description:**
Test the three-mode system across different browsers and devices.

**Acceptance Criteria:**
- [ ] Test on Chrome (latest, WebGPU enabled)
- [ ] Test on Firefox (latest, WASM fallback)
- [ ] Test on Safari (latest, iOS and macOS)
- [ ] Test on Edge (latest)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Document browser-specific issues and workarounds
- [ ] Create compatibility matrix

**Dependencies:** All implementation tasks

---

## Phase 12: Documentation

### Task 12.1: Create Technical Documentation
**Status:** pending
**Priority:** medium
**Estimated Effort:** 4 hours

**Description:**
Write comprehensive technical documentation for the three-mode query system.

**Acceptance Criteria:**
- [ ] Create `docs/VIDEO_AI_QUERY_MODES.md` with architecture overview
- [ ] Document embedding generation flow for each mode
- [ ] Document API endpoints and parameters
- [ ] Document caching strategies
- [ ] Document error handling and fallbacks
- [ ] Add performance benchmarks and optimization tips
- [ ] Include troubleshooting guide

**Files to Create:**
- `docs/VIDEO_AI_QUERY_MODES.md`
- `docs/EMBEDDING_OPTIMIZATION.md`

**Dependencies:** All implementation tasks

---

### Task 12.2: Add Code Documentation
**Status:** pending
**Priority:** medium
**Estimated Effort:** 2 hours

**Description:**
Add JSDoc comments to all new functions and types.

**Acceptance Criteria:**
- [ ] Add JSDoc to all exported functions
- [ ] Add JSDoc to all TypeScript interfaces and types
- [ ] Document function parameters and return types
- [ ] Add usage examples in comments
- [ ] Document error conditions
- [ ] Add @see references to related functions

**Files to Modify:**
- All files created/modified in previous tasks

**Dependencies:** All implementation tasks

---

### Task 12.3: Update README and User Guide
**Status:** pending
**Priority:** low
**Estimated Effort:** 2 hours

**Description:**
Update user-facing documentation to explain the three query modes.

**Acceptance Criteria:**
- [ ] Add section to README explaining three modes
- [ ] Create user guide with mode selection tips
- [ ] Add FAQ section for common questions
- [ ] Include screenshots of mode selector UI
- [ ] Document browser requirements
- [ ] Add performance comparison table

**Files to Modify:**
- `README.md`
- `docs/USER_GUIDE.md`

**Dependencies:** Task 12.1

---

## Summary

**Total Tasks:** 43
**Estimated Total Effort:** ~100 hours

**Phase Breakdown:**
- Phase 1 (Infrastructure): 11 hours
- Phase 2 (Fast Mode): 14 hours
- Phase 3 (Normal Mode): 3 hours
- Phase 4 (Thinking Mode): 9 hours
- Phase 5 (Server Sleep): 5 hours
- Phase 6 (Caching): 5 hours
- Phase 7 (Monitoring): 7 hours
- Phase 8 (Error Handling): 5 hours
- Phase 9 (Progressive Enhancement): 4 hours
- Phase 10 (i18n): 2 hours
- Phase 11 (Testing): 14 hours
- Phase 12 (Documentation): 8 hours

**Critical Path:**
1. Phase 1 (Infrastructure) → Phase 2 (Fast Mode) → Phase 4 (Thinking Mode)
2. Phase 3 (Normal Mode) can be done in parallel with Phase 2
3. Phase 5-10 can be done in parallel after core modes are implemented
4. Phase 11-12 should be done last

**Recommended Implementation Order:**
1. Start with Phase 1 (Infrastructure) - foundational
2. Implement Phase 2 (Fast Mode) - highest user impact
3. Verify Phase 3 (Normal Mode) - ensure existing flow works
4. Implement Phase 4 (Thinking Mode) - complete the three modes
5. Add Phase 5-10 (Supporting features) - enhance reliability and UX
6. Complete Phase 11-12 (Testing & Docs) - ensure quality
