# AI RAG Video Chat 完整架构文档

## 概述

这是一个基于 RAG (Retrieval-Augmented Generation) 的视频学习 AI 助手系统，允许学生在观看视频时提问，系统会基于视频内容、课程资料和用户上下文提供智能回答。

## 核心技术栈

### AI 服务
- **OpenRouter**: AI 模型聚合平台
- **默认模型**: `z-ai/glm-4.5-air:free` (智谱 GLM-4.5)
- **文档模型**: `nvidia/nemotron-nano-12b-v2-vl:free`
- **视觉模型**: `moonshotai/kimi-vl-a3b-thinking:free`

### 嵌入模型 (Dual Embedding Strategy)
- **E5-Small** (384维): 快速粗筛，用于第一阶段检索
- **BGE-M3** (1024维): 精确重排，用于第二阶段精排

### 核心库
- **LangChain**: AI 工作流编排
- **Supabase**: 数据库和向量存储
- **pgvector**: PostgreSQL 向量扩展
- **Whisper**: 视频转录 (外部服务)
- **QStash**: 后台任务队列

---

## 系统架构流程

### 阶段 1: 视频处理流程 (Video Processing Pipeline)

#### 1.1 视频上传
**文件**: `app/api/video-processing/upload/route.ts`

**流程**:
1. 用户上传视频到 MEGA 存储
2. 创建 `course_attachments` 记录
3. 创建 `video_processing_queue` 记录
4. 初始化处理步骤 (transcribe → embed)

**相关表**:
```sql
course_attachments (id, filename, file_type, mega_file_id, mega_file_key)
video_processing_queue (id, attachment_id, user_id, status, current_step, progress_percentage)
video_processing_steps (queue_id, step_name, status, started_at, completed_at)
```

#### 1.2 视频转录 (Transcription)
**文件**: `app/api/video-processing/steps/transcribe/route.ts`

**流程**:
1. 从 MEGA 下载视频
2. 调用 Whisper API 进行转录
3. 保存转录文本到数据库
4. 触发下一步 (embed)

**关键函数**:
```typescript
async function transcribeWithWhisper(
  audioSource: Blob | string,
  retryCount: number = 0
): Promise<WhisperResponse>
```

**Whisper API 配置**:
- Endpoint: `${WHISPER_URL}/transcribe?task=transcribe&beam_size=5`
- 支持 URL 和文件上传两种方式
- 自动重试机制 (最多 3 次)

#### 1.3 文本分段和嵌入生成 (Segmentation & Embedding)
**文件**: `app/api/video-processing/steps/embed/route.ts`
**处理器**: `lib/video-processing/segment-processor.ts`

**流程**:
1. **智能分段**: 将转录文本分成语义连贯的片段
   - 基于句子边界
   - 保持上下文连贯性
   - 添加重叠区域 (overlap) 以保持连续性

2. **生成双重嵌入**: 为每个片段生成 E5 和 BGE-M3 两种嵌入
   ```typescript
   const { e5_embedding, bge_embedding } = await generateDualEmbeddingWithWakeup(segmentText);
   ```

3. **保存到数据库**: 批量插入 `video_embeddings` 表

**分段策略**:
```typescript
function segmentTranscription(
  transcription: string,
  estimatedDuration: number
): VideoSegment[]
```
- 目标片段长度: 30-60 秒
- 重叠区域: 5 秒
- 保留句子完整性

**相关表**:
```sql
video_embeddings (
  id,
  attachment_id,
  content_text,
  embedding_e5_small vector(384),
  embedding_bge_m3 vector(1024),
  has_e5_embedding boolean,
  has_bge_embedding boolean,
  segment_index integer,
  segment_start_time double precision,
  segment_end_time double precision,
  segment_overlap_start double precision,
  segment_overlap_end double precision,
  chunk_type text, -- 'segment' or 'summary'
  hierarchy_level integer,
  topic_keywords text[],
  confidence_score double precision,
  word_count integer,
  sentence_count integer,
  prev_segment_id bigint,
  next_segment_id bigint
)
```

---

### 阶段 2: 用户提问流程 (Question Answering Pipeline)

#### 2.1 API 入口
**文件**: `app/api/ai/video-assistant/route.ts`

**请求格式**:
```typescript
{
  question: string,
  videoContext: {
    courseSlug: string,
    currentLessonId: string,
    currentTimestamp: number,
    selectedText?: string
  },
  conversationHistory?: Array<{role: string, content: string}>
}
```

#### 2.2 核心 AI 助手
**文件**: `lib/langChain/video-ai-assistant.ts`
**类**: `VideoLearningAIAssistant`

**四阶段处理流程**:

##### Stage 1: 问题分析 (Question Analysis)
```typescript
private async analyzeQuestion(
  question: string,
  videoContext: VideoContext,
  userId: number
): Promise<QuestionAnalysis>
```

**输出**:
```typescript
{
  searchQueries: string[],      // 优化的搜索词
  keyTerms: string[],           // 关键术语
  requiresCourseSpecific: boolean,
  confidenceThreshold: number,   // 置信度阈值
  suggestedFallback: 'web_search' | 'course_metadata' | 'none'
}
```

##### Stage 2: 证据收集 (Evidence Gathering)
```typescript
private async gatherEvidence(
  analysis: QuestionAnalysis,
  videoContext: VideoContext,
  userId: number
): Promise<EvidenceGathering>
```

**并行搜索 4 个数据源**:

1. **视频片段搜索** (`searchVideoSegments`)
   - 使用两阶段搜索策略
   - 优先搜索当前时间附近的片段
   
2. **课程内容搜索** (`searchCourseContent`)
   - 使用现有 embedding 系统
   - 搜索课程和课节内容
   
3. **课程元数据** (`queryCourseMetadata`)
   - 课程描述、学习目标
   - 当前课节信息
   
4. **用户学习上下文** (`getUserLearningContext`)
   - 用户笔记
   - 学习进度

**置信度计算**:
```typescript
private calculateConfidence(
  evidence: any[],
  analysis: QuestionAnalysis
): number
```
- 基础置信度: 0.2
- 证据数量加成: +0.25
- 关键词匹配加成: +0.25
- 内容类型权重:
  - video_segment: 0.3 (最高)
  - course/lesson: 0.25
  - note: 0.2
  - metadata: 0.15
  - web: 0.1 (最低)

##### Stage 3: Web 搜索回退 (Web Search Fallback)
```typescript
private async webSearchFallback(
  question: string,
  analysis: QuestionAnalysis,
  evidence: EvidenceGathering
): Promise<any>
```

**触发条件**: `evidence.confidence < analysis.confidenceThreshold`

##### Stage 4: 答案合成 (Answer Synthesis)
```typescript
private async synthesizeAnswer(
  originalQuestion: string,
  evidence: EvidenceGathering,
  webResults: any,
  videoContext: VideoContext,
  conversationHistory?: Array
): Promise<{content: string, suggestedActions: string[], relatedConcepts: string[]}>
```

**输出**:
- 综合答案
- 建议操作
- 相关概念

---

### 阶段 3: 视频片段检索 (Video Segment Retrieval)

#### 3.1 两阶段搜索策略
**文件**: `lib/langChain/tools/search-tool.ts`

**核心函数**:
```typescript
async function searchVideoEmbeddings(
  query: string,
  options: {
    lessonId?: string,
    attachmentId?: number,
    currentTime?: number,
    timeWindow?: number,
    maxResults?: number
  }
): Promise<any[]>
```

**搜索流程**:

1. **生成查询嵌入**:
   ```typescript
   const { embedding: e5Embedding } = await generateEmbedding(query, 'e5');
   const { embedding: bgeEmbedding } = await generateEmbedding(query, 'bge');
   ```

2. **Stage 1: E5 粗筛** (Fast Recall)
   - 使用 E5 (384维) 快速搜索
   - 返回 top 30 候选
   - 支持时间窗口过滤

3. **Stage 2: BGE-M3 精排** (Precise Reranking)
   - 对 top 30 候选使用 BGE-M3 (1024维) 重新排序
   - 返回 top 10 最相关结果

**数据库函数**: `search_video_embeddings_two_stage`
```sql
CREATE OR REPLACE FUNCTION search_video_embeddings_two_stage(
  query_embedding_e5 vector(384),
  query_embedding_bge vector(1024),
  p_attachment_id bigint,
  time_start double precision,
  time_end double precision,
  e5_threshold double precision DEFAULT 0.5,
  e5_candidate_count integer DEFAULT 30,
  final_count integer DEFAULT 10,
  weight_e5 double precision DEFAULT 0.3,
  weight_bge double precision DEFAULT 0.7
)
```

**时间窗口策略**:
- 如果提供 `currentTime`，搜索前后各 180 秒 (3分钟)
- 如果时间窗口结果不足，回退到全视频搜索

#### 3.2 回退策略
1. **两阶段搜索失败** → E5 单阶段搜索
2. **时间窗口结果不足** → 全视频搜索
3. **数据库搜索失败** → Mock 数据 (开发环境)

---

## 数据库架构

### 核心表结构

#### 1. video_embeddings (视频嵌入表)
```sql
CREATE TABLE video_embeddings (
  id bigint PRIMARY KEY,
  public_id uuid DEFAULT uuid_generate_v4(),
  attachment_id bigint NOT NULL,
  
  -- 嵌入向量
  embedding_e5_small vector(384),
  embedding_bge_m3 vector(1024),
  has_e5_embedding boolean DEFAULT false,
  has_bge_embedding boolean DEFAULT false,
  
  -- 内容
  content_text text NOT NULL,
  content_type text DEFAULT 'course',
  chunk_type text DEFAULT 'segment', -- 'segment' or 'summary'
  
  -- 片段信息
  segment_index integer,
  total_segments integer,
  segment_start_time double precision,
  segment_end_time double precision,
  segment_overlap_start double precision,
  segment_overlap_end double precision,
  segment_duration double precision,
  
  -- 片段关系
  prev_segment_id bigint,
  next_segment_id bigint,
  
  -- 内容分析
  contains_code boolean DEFAULT false,
  contains_math boolean DEFAULT false,
  contains_diagram boolean DEFAULT false,
  topic_keywords text[],
  confidence_score double precision,
  
  -- 元数据
  word_count integer,
  sentence_count integer,
  token_count integer,
  embedding_model text,
  language text DEFAULT 'auto',
  hierarchy_level integer DEFAULT 1,
  
  -- 状态
  status text DEFAULT 'pending',
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**索引**:
```sql
-- E5 向量索引 (IVFFlat)
CREATE INDEX idx_video_embeddings_e5_cosine 
ON video_embeddings USING ivfflat (embedding_e5_small vector_cosine_ops)
WITH (lists = 50);

-- BGE-M3 向量索引 (IVFFlat)
CREATE INDEX idx_video_embeddings_bge_cosine 
ON video_embeddings USING ivfflat (embedding_bge_m3 vector_cosine_ops)
WITH (lists = 50);

-- 时间窗口过滤索引
CREATE INDEX idx_video_embeddings_attachment_time_status 
ON video_embeddings(attachment_id, segment_start_time, segment_end_time, status);
```

#### 2. video_processing_queue (处理队列表)
```sql
CREATE TABLE video_processing_queue (
  id bigint PRIMARY KEY,
  public_id uuid DEFAULT uuid_generate_v4(),
  attachment_id bigint NOT NULL,
  user_id uuid NOT NULL,
  
  -- 状态
  status text DEFAULT 'pending',
  current_step text DEFAULT 'transcribe',
  progress_percentage integer DEFAULT 0,
  
  -- 重试
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  
  -- QStash
  qstash_message_id text,
  
  -- 错误处理
  error_message text,
  error_details jsonb,
  last_error_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3. video_processing_steps (处理步骤表)
```sql
CREATE TABLE video_processing_steps (
  id bigint PRIMARY KEY,
  queue_id bigint NOT NULL REFERENCES video_processing_queue(id),
  step_name text NOT NULL, -- 'transcribe', 'embed'
  
  -- 状态
  status text DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  
  -- 时间
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  
  -- 输出
  output_data jsonb,
  error_message text,
  
  created_at timestamptz DEFAULT now()
);
```

#### 4. course_attachments (课程附件表)
```sql
CREATE TABLE course_attachments (
  id bigint PRIMARY KEY,
  filename text NOT NULL,
  file_type text, -- 'video', 'document', 'image'
  file_size bigint,
  
  -- MEGA 存储
  mega_file_id text,
  mega_file_key text,
  mega_download_url text,
  
  -- 视频特定
  duration_seconds integer,
  transcript text,
  
  created_at timestamptz DEFAULT now()
);
```

---

## 关键算法和原理

### 1. 双重嵌入策略 (Dual Embedding Strategy)

**为什么使用两种嵌入模型？**

- **E5-Small (384维)**:
  - 优点: 快速、内存占用小
  - 用途: 第一阶段粗筛，快速过滤不相关内容
  - 召回率高，但精确度较低

- **BGE-M3 (1024维)**:
  - 优点: 精确度高、语义理解强
  - 用途: 第二阶段精排，提高最终结果质量
  - 精确度高，但计算成本高

**组合策略**:
```
Final Score = 0.3 × E5_similarity + 0.7 × BGE_similarity
```

### 2. 智能分段算法

**文件**: `lib/video-processing/segment-processor.ts`

**目标**:
- 保持语义连贯性
- 适合 RAG 检索的片段大小
- 避免句子被截断

**策略**:
```typescript
// 1. 按句子分割
const sentences = text.split(/[.!?]+/);

// 2. 组合成 30-60 秒的片段
const targetDuration = 45; // 秒
const wordsPerSecond = 2.5;
const targetWords = targetDuration * wordsPerSecond;

// 3. 添加重叠区域 (5秒)
const overlapWords = 5 * wordsPerSecond;
```

**重叠区域的作用**:
- 防止关键信息在片段边界丢失
- 提供上下文连续性
- 提高检索准确度

### 3. 时间感知搜索 (Time-Aware Search)

**原理**: 用户在特定时间点提问，附近的内容更相关

**实现**:
```typescript
if (currentTime !== undefined && currentTime > 0) {
  const expandedWindow = timeWindow * 3; // 默认 ±180秒
  timeStart = Math.max(0, currentTime - expandedWindow);
  timeEnd = currentTime + expandedWindow;
}
```

**回退策略**:
- 时间窗口结果 < 5 个 → 扩展到全视频
- 保证用户总能得到答案

### 4. 置信度评分系统

**多因素评分**:
```typescript
confidence = 0.2 (base)
  + min(evidence.length * 0.08, 0.25)  // 证据数量
  + (keyTermMatches / total) * 0.25     // 关键词匹配
  + weightedTypeScore * 0.3             // 内容类型权重
  + videoConfidence * 0.15              // 视频片段置信度
```

**内容类型权重**:
- video_segment: 0.3 (最可靠)
- course/lesson: 0.25
- user_note: 0.2
- metadata: 0.15
- web_search: 0.1 (最不可靠)

---

## 工具和集成

### 1. LangChain 工具系统

**文件**: `lib/langChain/tools/search-tool.ts`

**Search Tool**:
```typescript
export const searchTool = new DynamicStructuredTool({
  name: "search",
  description: "Search for relevant content including video transcripts",
  schema: SearchSchema,
  func: async (input) => {
    // 搜索视频片段 + 通用内容
    // 返回 JSON 格式的结构化结果
  }
});
```

**输入**:
```typescript
{
  query: string,
  contentTypes: ['video_segment', 'lesson', 'note'],
  videoContext: {
    lessonId: string,
    attachmentId: number,
    currentTime: number
  }
}
```

**输出**:
```typescript
{
  message: string,
  results: Array<{
    type: 'video_segment' | 'lesson' | 'note',
    content: string,
    startTime?: number,
    endTime?: number,
    similarity: number
  }>,
  count: number,
  hasVideoSegments: boolean
}
```

### 2. API Key 管理

**文件**: `lib/langChain/api-key-manager.ts`

**功能**:
- 多 API Key 轮换
- 自动故障转移
- 速率限制管理
- 错误追踪

**选择策略**:
1. **round_robin**: 轮询选择
2. **least_used**: 选择使用最少的 key
3. **best_performance**: 选择错误率最低的 key

### 3. 嵌入生成服务

**文件**: `lib/langChain/embedding.ts`

**核心函数**:
```typescript
export async function generateDualEmbeddingWithWakeup(
  text: string
): Promise<{
  e5_embedding: number[],
  bge_embedding: number[],
  e5_success: boolean,
  bge_success: boolean
}>
```

**特性**:
- 并行生成两种嵌入
- 自动唤醒休眠服务器
- 重试机制
- 错误处理

---

## 性能优化

### 1. 向量索引优化

**IVFFlat 索引**:
```sql
CREATE INDEX USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);
```

- **lists = 50**: 平衡搜索速度和准确度
- **cosine distance**: 适合语义相似度计算

### 2. 批量处理

**嵌入生成**:
```typescript
const BATCH_SIZE = 5;
const CONCURRENT_LIMIT = 3;

// 批量处理片段
for (let i = 0; i < segments.length; i += BATCH_SIZE) {
  const batch = segments.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(processSegment));
}
```

### 3. 缓存策略

**LLM 响应缓存**:
```typescript
class SimpleCache {
  private cache: Map<string, { response: any; timestamp: number }>;
  private ttl: number = 3600000; // 1 hour
}
```

### 4. 并行搜索

**证据收集并行化**:
```typescript
const [courseContent, metadata, userContext, videoSegments] = 
  await Promise.all([
    searchCourseContent(),
    queryCourseMetadata(),
    getUserLearningContext(),
    searchVideoSegments()
  ]);
```

---

## 错误处理和重试

### 1. 视频处理重试

**配置**:
```typescript
const EMBED_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [15, 30, 60], // 秒
  BATCH_SIZE: 5,
  CONCURRENT_LIMIT: 3
};
```

**重试触发条件**:
- 嵌入服务器休眠
- 网络超时
- 临时错误

### 2. 搜索回退策略

**多层回退**:
1. 两阶段搜索 (E5 + BGE)
2. → E5 单阶段搜索
3. → 时间窗口扩展
4. → 全视频搜索
5. → Mock 数据 (开发环境)

### 3. QStash 队列管理

**文件**: `utils/qstash/queue-manager.ts`

**功能**:
- 任务队列管理
- 自动重试
- 死信队列
- 任务监控

---

## API 端点总结

### 视频处理
- `POST /api/video-processing/upload` - 上传视频
- `POST /api/video-processing/steps/transcribe` - 转录
- `POST /api/video-processing/steps/embed` - 生成嵌入
- `GET /api/video-processing/status/:queueId` - 查询状态

### AI 助手
- `POST /api/ai/video-assistant` - 提问
- `GET /api/ai/video-assistant` - 检查状态
- `POST /api/ai/stream` - 流式响应
- `POST /api/ai/tools` - 工具调用

### 搜索
- `POST /api/search/universal` - 通用搜索
- Database RPC: `search_video_embeddings_two_stage`
- Database RPC: `search_video_embeddings_e5`

---

## 前端集成

### ✅ 真正使用的组件 (Active Components)

#### 1. VideoAIAssistant - 主 AI 聊天组件 ⭐
**文件**: `components/course/video-ai-assistant.tsx`
**使用位置**: `components/course/course-learning-content.tsx` (第 1660-1666 行)

```typescript
{activeTab === "ai" && (
  <VideoAIAssistant
    courseSlug={courseSlug}
    currentLessonId={currentLessonId}
    currentTimestamp={currentTimestamp}
    selectedText={selectedText}
    onSeekTo={handleSeekTo}
  />
)}
```

**功能**:
- 流式 AI 对话
- 视频上下文感知
- 时间戳跳转
- 来源引用
- 建议问题

#### 2. BilibiliVideoPlayer - 视频播放器 ⭐
**文件**: `components/video/bilibili-video-player.tsx`
**使用位置**: `components/course/course-learning-content.tsx` (多处)

**关键功能**:
- Video Player API 注册 (第 776-826 行)
- MEGA 附件流式播放
- 外部视频支持 (YouTube/Vimeo)
- 字幕、章节、弹幕

```typescript
// 注册全局 Video Player API
const videoPlayerAPI: VideoPlayerAPI = useMemo(() => ({
  seekTo: async (timestamp: number) => {
    videoRef.current.currentTime = timestamp;
  },
  getCurrentTime: () => currentTime,
  play: async () => { ... },
  pause: async () => { ... },
}), [currentTime, duration]);

setGlobalVideoPlayer(videoPlayerAPI);
```

### Hooks (Active)

#### useStreamingVideoAI ⭐ (推荐使用)
**文件**: `hooks/course/use-video-ai.ts`
**用途**: 流式 AI 对话

```typescript
const { askStreaming, isLoading, error } = useStreamingVideoAI(videoContext);

// 流式调用
for await (const chunk of askStreaming(question)) {
  if (chunk.type === 'token') {
    console.log(chunk.content); // 实时显示
  }
}
```

#### useVideoAI (基础版本)
**文件**: `hooks/course/use-video-ai.ts`
**用途**: 非流式 AI 调用

```typescript
const { askQuestionAsync, isLoading, error } = useVideoAI();

const response = await askQuestionAsync({
  question: "What is this concept?",
  videoContext: {
    courseSlug: "intro-to-ai",
    currentLessonId: "lesson-1",
    currentTimestamp: 125
  }
});
```

#### Video Player API
**文件**: `hooks/video/use-video-player.ts`

```typescript
// 注册播放器
setGlobalVideoPlayer(videoPlayerAPI);

// 获取播放器
const player = getGlobalVideoPlayer();
await player.seekTo(125);

// 清理
clearGlobalVideoPlayer();
```

---

### ❌ 废弃的组件 (Deprecated - 应删除)

#### VideoQAPanel ❌
**文件**: `components/video/video-qa-panel.tsx`
**状态**: 已被 VideoAIAssistant 替代，但代码未删除

**问题**:
- 使用旧 API: `/api/video/qa` (已废弃)
- 不支持流式响应
- 功能完全被 VideoAIAssistant 替代

**仍被引用**: `components/video/bilibili-video-player.tsx` (第 3370-3377 行)

**建议**: ⚠️ 立即删除此组件及相关代码

---

### 📊 组件使用关系

```
course-learning-content.tsx (主页面)
    ├── BilibiliVideoPlayer ✅
    │   ├── VideoTermsTooltip ✅
    │   ├── VideoTermsIndicator ✅
    │   └── VideoQAPanel ❌ (废弃，应删除)
    │
    ├── VideoAIAssistant ✅ (主 AI 聊天)
    │   └── useStreamingVideoAI ✅
    │       └── /api/ai/video-assistant ✅
    │
    ├── CourseChapterContent ✅
    └── CourseNoteContent ✅
```

---

### 🔄 完整数据流 (当前使用)

```
用户在视频页面提问
    ↓
VideoAIAssistant 组件 ✅
    ↓
useStreamingVideoAI hook ✅
    ↓
POST /api/ai/video-assistant ✅ (流式)
    ↓
VideoLearningAIAssistant.assistUser() ✅
    ↓
四阶段处理:
  1. analyzeQuestion() ✅
  2. gatherEvidence() ✅
     - searchVideoSegments() ✅
     - searchCourseContent() ✅
     - queryCourseMetadata() ✅
     - getUserLearningContext() ✅
  3. webSearchFallback() ⚠️ (未实现真正的 web 搜索)
  4. synthesizeAnswer() ✅
    ↓
流式返回答案 ✅
    ↓
VideoAIAssistant 实时显示 ✅
    ↓
用户可点击时间戳跳转 ✅
    ↓
调用 videoPlayerAPI.seekTo() ✅
```

---

## 配置和环境变量

### 必需变量
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# OpenRouter
OPEN_ROUTER_KEY_1=
OPEN_ROUTER_MODEL=z-ai/glm-4.5-air:free

# Whisper
WHISPER_URL=

# Embedding Services
E5_EMBEDDING_URL=
BGE_EMBEDDING_URL=

# QStash
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Site
NEXT_PUBLIC_SITE_URL=
```

### 可选配置
```env
# 视频处理
VIDEO_SEGMENTS_LIMIT=3
VIDEO_SEARCH_MAX_RESULTS=5
VIDEO_SEARCH_SIMILARITY_THRESHOLD=0.7

# 模型选择
OPEN_ROUTER_DOCUMENT_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
OPEN_ROUTER_IMAGE_MODEL=moonshotai/kimi-vl-a3b-thinking:free
```

---

## 总结

这个 AI RAG Video Chat 系统通过以下关键技术实现了高质量的视频问答：

1. **双重嵌入策略**: E5 快速召回 + BGE-M3 精确重排
2. **智能分段**: 保持语义连贯性的视频内容分段
3. **时间感知搜索**: 优先搜索当前时间附近的内容
4. **多源证据收集**: 结合视频、课程、笔记、元数据
5. **置信度评分**: 智能评估答案质量，必要时触发 web 搜索
6. **四阶段处理**: 问题分析 → 证据收集 → 回退搜索 → 答案合成

整个系统设计注重性能、准确度和用户体验的平衡。
