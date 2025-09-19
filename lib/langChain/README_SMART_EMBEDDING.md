# 智能Embedding系统 - HF服务器睡眠处理方案

## 🚀 概述

此系统解决了Hugging Face Spaces服务器自动睡眠导致的embedding生成失败问题。通过智能重试、服务器唤醒和错误恢复机制，确保BGE和E5 embedding都能成功生成。

## 🔧 核心功能

### 1. 智能服务器唤醒
- **自动检测睡眠状态**: 识别常见的服务器睡眠错误信息
- **多步骤唤醒流程**: 
  1. 访问根端点唤醒容器
  2. 检查健康状态端点
  3. 发送测试embedding请求加载模型
- **渐进式重试**: 30s → 1min → 2min 的重试间隔

### 2. 双重Embedding智能生成
- **顺序处理**: 先处理E5（通常更稳定），再处理BGE
- **避免服务器过载**: 如果E5刚被唤醒，等待15秒再尝试BGE
- **至少一个成功**: 只要有一个embedding成功就继续处理

### 3. 健康检查与预热
- **服务器健康检查**: `/healthz` 端点状态监控
- **预热API**: `/api/embeddings/warmup` 手动唤醒服务器
- **批量处理优化**: 自动预热服务器用于批量embedding

## 📋 主要函数

### `generateEmbeddingWithWakeup(text, model, maxRetries)`
智能单个embedding生成，包含服务器唤醒逻辑。

```typescript
const result = await generateEmbeddingWithWakeup(text, 'bge', 3);
console.log(`Generated ${result.model} embedding (${result.dimensions}d)`);
if (result.wasServerSleeping) {
  console.log(`Server was sleeping, took ${result.wakeupAttempts} wake-up attempts`);
}
```

### `generateDualEmbeddingWithWakeup(text)`
智能双重embedding生成，顺序处理E5和BGE。

```typescript
const result = await generateDualEmbeddingWithWakeup(text);
console.log(`Success: E5=${result.e5_success}, BGE=${result.bge_success}`);
console.log(`Wake-up status: E5=${result.e5_was_sleeping}, BGE=${result.bge_was_sleeping}`);
```

### `preWarmEmbeddingServers()`
预热两个embedding服务器。

```typescript
const warmup = await preWarmEmbeddingServers();
console.log(`Warmup completed in ${warmup.total_time_ms}ms`);
console.log(`E5: ${warmup.e5_warmed}, BGE: ${warmup.bge_warmed}`);
```

## 🌐 API端点

### POST `/api/embeddings/warmup`
手动预热embedding服务器

```bash
curl -X POST http://localhost:3000/api/embeddings/warmup
```

响应示例：
```json
{
  "success": true,
  "total_time_ms": 45000,
  "warmup_results": {
    "e5_warmed": true,
    "bge_warmed": true
  },
  "health_status": {
    "e5": { "isHealthy": true, "isSleeping": false },
    "bge": { "isHealthy": true, "isSleeping": false }
  }
}
```

### GET `/api/embeddings/warmup`
检查服务器健康状态

```bash
curl http://localhost:3000/api/embeddings/warmup
```

## ⚙️ 配置

### 环境变量
```bash
E5_HG_EMBEDDING_SERVER_API_URL="https://edusocial-e5-small-embedding-server.hf.space"
BGE_HG_EMBEDDING_SERVER_API_URL="https://edusocial-bge-m3-embedding-server.hf.space"
```

### 超时设置
- **默认API超时**: 30秒
- **服务器唤醒超时**: 5分钟
- **后台批量处理**: 2分钟

### 重试配置
- **最大唤醒重试**: 3次
- **重试间隔**: [30s, 60s, 120s]
- **错误检测关键词**: `['server is sleeping', 'loading model', 'connection refused', ...]`

## 🔍 睡眠检测机制

系统自动检测以下错误指示服务器睡眠：
- `server is sleeping`
- `loading model` / `model is loading`
- `application startup is in progress`
- `service unavailable`
- `connection refused`
- `fetch failed`
- `network error`

## 📊 使用示例

### Video Processing集成
```typescript
// 在 video-processing/steps/embed/route.ts 中
const embeddingResult = await generateDualEmbeddings(transcription_text);

// 保存到数据库
const payload = {
  embedding_e5_small: embeddingResult.e5_embedding,
  embedding_bge_m3: embeddingResult.bge_embedding,
  has_e5_embedding: embeddingResult.has_e5,
  has_bge_embedding: embeddingResult.has_bge,
  embedding_model: embeddingResult.has_bge && embeddingResult.has_e5 
    ? 'dual:BAAI/bge-m3+intfloat/e5-small' 
    : embeddingResult.has_bge ? 'BAAI/bge-m3' : 'intfloat/e5-small'
};
```

### 批量处理
```typescript
// 自动预热 + 批量处理
const batchResult = await generateDualBatchEmbeddingsWithRetry(texts, 3);
console.log(`Batch completed: ${batchResult.success_count}/2 models successful`);
```

## 🐛 故障排除

### BGE Embedding仍然失败？
1. 检查环境变量是否正确设置
2. 手动调用预热API: `POST /api/embeddings/warmup`
3. 查看控制台日志中的唤醒过程
4. 直接访问BGE服务器URL确认可用性

### 服务器响应慢？
- HF免费服务器在冷启动时需要1-3分钟
- 考虑在应用启动时调用预热API
- 批量处理时自动预热功能会减少延迟

### 日志监控
关键日志信息：
- `🚀 Starting smart dual embedding generation...`
- `✅ E5/BGE embedding generated successfully`
- `❌ E5/BGE embedding failed`
- `Wake up result for E5/BGE: SUCCESS/FAILED`

## 🔄 版本兼容性

所有旧的embedding函数仍然可用，它们会自动使用新的智能重试逻辑：
- `generateEmbedding()` → 使用 `generateEmbeddingWithWakeup()`
- `generateDualEmbedding()` → 使用 `generateDualEmbeddingWithWakeup()`
- `generateEmbeddingWithRetry()` → 增强的重试逻辑

这确保了向后兼容性，无需修改现有代码。
