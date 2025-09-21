# 🎬 Studify 视频处理流程文档

## 📋 流程概览

视频处理系统采用异步队列模式，通过 QStash 管理任务调度。整个流程已简化为 **2个主要步骤**：

```
📤 Upload → 🎵 Transcribe → 🧠 Embed
```

## 🏗️ 系统架构

### 核心组件
- **QStash**: 异步任务队列管理
- **Supabase**: 数据库存储队列状态和结果
- **HuggingFace**: AI服务（转录和嵌入生成）
- **Next.js API Routes**: 处理端点

### 数据库表
- `video_processing_queue`: 主队列表，跟踪整体进度
- `video_processing_steps`: 每个步骤的详细状态
- `video_embeddings`: 存储生成的向量嵌入

---

## 🚀 详细流程说明

### 步骤 1: 视频上传 📤

**文件**: `/app/api/video-processing/upload/route.ts`

#### 功能职责:
1. **接收视频文件**: 处理用户上传的视频
2. **数据库初始化**: 创建队列记录和处理步骤
3. **队列启动**: 直接启动转录任务

#### 关键操作:
```typescript
// 创建队列记录
const { data: queueRecord } = await client
  .from("video_processing_queue")
  .insert({
    attachment_id,
    user_id,
    status: 'pending',
    current_step: 'transcribe',
    progress_percentage: 20
  });

// 立即队列转录任务
const qstashResponse = await queueManager.enqueue(
  queueName,
  transcribeEndpoint,
  {
    queue_id: queueRecord.id,
    attachment_id,
    user_id,
    audio_url: videoUrl, // 直接使用视频URL
    timestamp: new Date().toISOString()
  },
  { retries: 5 }
);
```

#### 输出:
- 队列记录 (queue_id)
- QStash 任务 (转录)
- 预估完成时间: 3-5分钟

---

### 步骤 2: 转录处理 🎵

**文件**: `/app/api/video-processing/steps/transcribe/route.ts`

#### 功能职责:
1. **音频下载**: 从视频URL提取音频
2. **服务器预热**: 唤醒可能休眠的 HuggingFace 服务器
3. **语音转录**: 使用 Whisper AI 生成文字转录
4. **智能重试**: 处理服务器冷启动和失败情况

#### 核心处理逻辑:

##### 2.1 队列验证
```typescript
// 检查队列记录是否存在
const { data: queueData, error: queueError } = await client
  .from("video_processing_queue")
  .select("retry_count, max_retries, status")
  .eq("id", queue_id);

if (!queueData || queueData.length === 0) {
  // 处理孤立的QStash消息
  return NextResponse.json({
    message: "Queue record not found - orphaned QStash message",
    queue_id,
    action: "skipped"
  }, { status: 200 });
}
```

##### 2.2 音频下载
```typescript
async function downloadAudioFile(audioUrl: string): Promise<Blob> {
  // 支持多种格式: .wav, .mp3, .m4a, .mp4, .mov, .ogg, .flac, .aac, .webm, .avi
  const response = await fetch(audioUrl, {
    headers: {
      'Accept': 'audio/*, video/*, application/octet-stream, ...'
    }
  });
  
  // 验证文件大小和类型
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 1024) {
    throw new Error('Downloaded file too small to be valid audio');
  }
  
  return new Blob([arrayBuffer], { type: contentType });
}
```

##### 2.3 服务器预热策略
```typescript
async function warmupWhisperServer(): Promise<boolean> {
  // 发送静音音频唤醒服务器
  const silentAudioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  const warmupBlob = new Blob([silentAudioBytes], { type: 'audio/wav' });
  
  const response = await fetch(`${whisperUrl}/transcribe?task=transcribe&beam_size=1`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(30000) // 30秒预热超时
  });
  
  return response.ok;
}
```

##### 2.4 智能重试机制
```typescript
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [30, 60, 120], // 30s → 1m → 2m
  WARMUP_TIMEOUT: 30000,      // 30秒
  PROCESSING_TIMEOUT: 600000   // 10分钟
};

// 重试逻辑
if (isServerSleeping && retryCount < MAX_RETRIES) {
  const nextRetryCount = retryCount + 1;
  await scheduleRetry(queue_id, attachment_id, user_id, audio_url, nextRetryCount);
}
```

#### 重试场景处理:
- **服务器休眠**: HTTP 502/503/504 → 预热 + 重试
- **速率限制**: HTTP 429 → 延迟重试
- **超时错误**: TimeoutError → 重试
- **连接失败**: ECONNREFUSED → 重试

#### 输出:
- 转录文本 (transcription_text)
- 语言检测 (language)
- 队列下一步任务 (嵌入生成)

---

### 步骤 3: 嵌入生成 🧠

**文件**: `/app/api/video-processing/steps/embed/route.ts`

#### 功能职责:
1. **文本分段**: 将转录文本分割为有意义的片段
2. **向量嵌入**: 为每个片段生成AI向量表示
3. **数据存储**: 保存嵌入向量到数据库
4. **完成通知**: 通知用户处理完成

#### 核心处理逻辑:

##### 3.1 文本分段策略
```typescript
// 从segment-processor.ts导入
const segments = segmentTranscription(transcriptionText, estimatedDuration);

// 分段逻辑:
// - 按语义边界分割 (句子/段落)
// - 考虑时间轴对应关系
// - 添加重叠区域提高检索准确性
// - 标记内容类型 (代码/数学/图表)
```

##### 3.2 双模型嵌入生成
```typescript
// 使用两个不同的嵌入模型提高检索效果
const processedSegments = await processSegmentsWithEmbeddings(segments, attachment_id);

// 支持的模型:
// - BAAI/bge-m3: 中英文优化模型
// - intfloat/e5-small: 轻量级通用模型
```

##### 3.3 数据库存储
```typescript
const segmentPayload = {
  attachment_id,
  content_type: 'course',
  embedding_e5_small: segment.embedding.e5_embedding,
  embedding_bge_m3: segment.embedding.bge_embedding,
  has_e5_embedding: segment.embedding.has_e5,
  has_bge_embedding: segment.embedding.has_bge,
  content_text: segment.content,
  
  // 时间轴信息
  segment_start_time: segment.startTime,
  segment_end_time: segment.endTime,
  
  // 内容分析
  contains_code: segment.containsCode,
  contains_math: segment.containsMath,
  topic_keywords: segment.topicKeywords,
  confidence_score: segment.confidenceScore,
  
  // 统计信息
  word_count: segment.wordCount,
  token_count: Math.ceil(segment.wordCount * 1.3)
};

await client.from('video_embeddings').insert(segmentPayload);
```

#### 输出:
- 向量嵌入存储在数据库
- 支持语义搜索的视频片段
- 用户完成通知

---

## 🔄 错误处理和重试

### 孤立消息处理
当队列记录不存在但QStash消息仍在处理时:
```typescript
if (!queueData || queueData.length === 0) {
  console.warn(`⚠️ Queue not found with ID: ${queue_id}. Orphaned QStash message.`);
  return NextResponse.json({
    message: "Queue record not found - orphaned QStash message",
    action: "skipped"
  }, { status: 200 }); // 返回成功避免QStash重试
}
```

### HuggingFace 服务器冷启动
1. **检测休眠**: 502/503/504状态码或超时
2. **预热策略**: 发送静音音频唤醒服务器
3. **等待策略**: 预热后等待5秒再处理
4. **渐进重试**: 30s → 1m → 2m 延迟重试

### 数据库状态同步
```typescript
// 更新队列状态
await client
  .from("video_processing_queue")
  .update({
    status: 'processing',
    current_step: 'transcribe',
    progress_percentage: 65,
    retry_count: retryCount
  })
  .eq("id", queue_id);

// 更新步骤状态
await client
  .from("video_processing_steps")
  .update({
    status: 'processing',
    started_at: new Date().toISOString(),
    retry_count: retryCount
  })
  .eq("queue_id", queue_id)
  .eq("step_name", "transcribe");
```

---

## 🛠️ 管理和监控

### 队列清理工具
**文件**: `/app/api/admin/cleanup-queue/route.ts`

#### 功能:
- 检查活跃队列记录: `GET /api/admin/cleanup-queue`
- 清理卡住的记录: `DELETE /api/admin/cleanup-queue`
- 识别孤立的QStash消息

### 通知系统
**文件**: `/lib/video-processing/notification-service.ts`

#### 通知时机:
- 处理开始
- 每个步骤完成
- 处理失败
- 最终完成

---

## 📊 性能和配置

### 处理时间预估
- **短视频** (< 5分钟): 1-2分钟
- **中等视频** (5-30分钟): 3-8分钟  
- **长视频** (> 30分钟): 10-20分钟

### 重试配置
```typescript
// 转录步骤
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [30, 60, 120], // 秒
  WARMUP_TIMEOUT: 30000,       // 30秒
  PROCESSING_TIMEOUT: 600000   // 10分钟
};

// 嵌入步骤  
const EMBED_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [30, 60, 120], // 秒
};
```

### 队列命名规则
```typescript
// 基于用户ID的队列命名，确保用户任务有序执行
const userIdHash = userId.replace(/-/g, '').substring(0, 12);
const queueName = `video_${userIdHash}`;
```

---

## 🚨 故障排除

### 常见问题

1. **Queue not found error**:
   - 原因: QStash消息引用已删除的队列记录
   - 解决: 现已实现孤立消息跳过机制

2. **HuggingFace服务器超时**:
   - 原因: 服务器休眠或过载
   - 解决: 智能预热 + 渐进重试

3. **音频下载失败**:
   - 原因: 无效URL或网络问题
   - 解决: 内容类型验证 + 文件大小检查

4. **嵌入生成失败**:
   - 原因: AI服务不可用
   - 解决: 双模型支持 + 重试机制

### 监控建议
- 监控队列积压情况
- 跟踪平均处理时间
- 监控HuggingFace API健康状态
- 定期清理失败的队列记录

---

## 🔮 未来优化

1. **分布式处理**: 支持多实例并行处理
2. **缓存优化**: 缓存常用的嵌入结果
3. **实时进度**: WebSocket实时进度更新
4. **批量处理**: 支持多视频批量上传
5. **质量评估**: 转录质量自动评估和改进建议
