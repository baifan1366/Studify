# AI RAG Video Chat 完整架构文档

## 概述

这是一个基于 RAG (Retrieval-Augmented Generation) 的视频学习 AI 助手系统，允许学生在观看视频时提问，系统会基于视频内容、课程资料和用户上下文提供智能回答。

## 核心技术栈

### AI 服务
- **OpenRouter**: AI 模型聚合平台
- **Fast 模式**: `google/gemma-4-26b-a4b-it:free` (快速响应，thinking 禁用)
- **Thinking 模式**: `google/gemma-4-31b-it:free` (推理模式，thinking 启用)
- **多模态支持**: 两个模型都支持文本、图像、视频输入

### 嵌入模型 (Dual Embedding Strategy)
- **E5-Small** (384维): 快速粗筛，用于第一阶段检索
- **BGE-M3** (1024维): 精确重排，用于第二阶段精排

### Google Gemma 4 模型特性

#### Gemma 4 26B A4B (Fast Mode) ⚡
**模型 ID**: `google/gemma-4-26b-a4b-it:free`

**架构特点**:
- **MoE (Mixture-of-Experts)**: 总参数 25.2B，但每个 token 仅激活 3.8B 参数
- **性能**: 接近 31B 模型的质量，但计算成本大幅降低
- **上下文窗口**: 256K tokens
- **多模态支持**: 文本、图像、视频 (最长 60 秒 @ 1fps)

**使用场景**:
- 用户选择 "Fast" 模式时使用
- 快速响应，thinking 禁用
- 适合日常问答、内容总结

**API 调用示例**:
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPEN_ROUTER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemma-4-26b-a4b-it:free',
    messages: [
      { role: 'user', content: 'Explain this concept briefly' }
    ],
    // thinking 禁用 - 快速响应
  })
});
```

#### Gemma 4 31B (Thinking Mode) 🧠
**模型 ID**: `google/gemma-4-31b-it:free`

**架构特点**:
- **Dense Model**: 30.7B 参数的密集型模型
- **上下文窗口**: 256K tokens
- **Thinking Mode**: 支持可配置的推理/思考模式
- **多模态支持**: 文本和图像输入
- **原生功能**: Function calling、结构化输出

**Thinking Mode 工作原理**:
1. **启用 Thinking**: 在 API 请求中设置特殊参数
2. **推理过程**: 模型先生成内部思考过程 (在 `<|channel>thought` 标记内)
3. **最终答案**: 思考完成后生成最终答案
4. **输出结构**: 
   ```
   <|channel>thought
   [详细的推理步骤...]
   <channel|>
   [最终答案]
   ```

**使用场景**:
- 用户选择 "Thinking" 模式时使用
- 复杂推理、数学问题、代码分析
- 需要展示推理过程的场景

**API 调用示例 (Thinking 启用)**:
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPEN_ROUTER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemma-4-31b-it:free',
    messages: [
      // 启用 thinking 的系统提示
      { role: 'system', content: '<|think|>' },
      { role: 'user', content: 'Solve this complex problem step by step' }
    ],
    // 或使用 OpenRouter 的 reasoning 参数
    reasoning: {
      enabled: true
    }
  })
});

// 解析响应
const result = await response.json();
const fullResponse = result.choices[0].message.content;

// 提取 thinking 和 answer
const thinkingMatch = fullResponse.match(/<\|channel>thought\n([\s\S]*?)<channel\|>/);
const thinking = thinkingMatch ? thinkingMatch[1] : '';
const answer = fullResponse.replace(/<\|channel>thought[\s\S]*?<channel\|>/, '').trim();

console.log('Thinking:', thinking);
console.log('Answer:', answer);
```

#### 结构化输出 (JSON Schema) 📋

**两种模型都支持结构化输出**，确保 AI 返回符合特定 JSON Schema 的响应。

**使用方法**:
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPEN_ROUTER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemma-4-31b-it:free', // 或 gemma-4-26b-a4b-it:free
    messages: [
      { role: 'user', content: 'Extract key information from this video segment' }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'video_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: '视频片段摘要' },
            keyPoints: { 
              type: 'array', 
              items: { type: 'string' },
              description: '关键要点列表'
            },
            topics: { 
              type: 'array', 
              items: { type: 'string' },
              description: '涉及的主题'
            },
            confidence: { 
              type: 'number', 
              description: '置信度 (0-1)',
              minimum: 0,
              maximum: 1
            }
          },
          required: ['summary', 'keyPoints', 'topics', 'confidence'],
          additionalProperties: false
        }
      }
    }
  })
});

// 响应将严格遵循 schema
const result = await response.json();
const data = JSON.parse(result.choices[0].message.content);
console.log(data.summary);
console.log(data.keyPoints);
```

**结构化输出的优势**:
- ✅ 100% 可靠的 JSON 格式
- ✅ 类型安全，避免解析错误
- ✅ 无幻觉字段
- ✅ 简化应用程序集成

**最佳实践**:
1. 始终设置 `strict: true` 确保严格遵循 schema
2. 为每个属性添加清晰的 `description`
3. 使用 `required` 字段指定必需属性
4. 设置 `additionalProperties: false` 防止额外字段

#### 模型对比

| 特性 | Gemma 4 26B A4B (Fast) | Gemma 4 31B (Thinking) |
|------|------------------------|------------------------|
| 参数量 | 25.2B (激活 3.8B) | 30.7B (全部激活) |
| 架构 | MoE | Dense |
| 速度 | ⚡ 极快 | 🐢 较慢 |
| Thinking Mode | ❌ 不支持 | ✅ 支持 |
| 多模态 | 文本、图像、视频 | 文本、图像 |
| 上下文窗口 | 256K | 256K |
| 结构化输出 | ✅ 支持 | ✅ 支持 |
| Function Calling | ✅ 支持 | ✅ 支持 |
| 适用场景 | 快速问答、内容总结 | 复杂推理、代码分析 |

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

## 实现指南：集成 Gemma 4 模型

### 1. 前端：用户模式选择

在 AI 助手界面添加模式选择器：

```typescript
// components/course/video-ai-assistant.tsx
import { useState } from 'react';

type AIMode = 'fast' | 'thinking';

export function VideoAIAssistant({ ... }) {
  const [aiMode, setAIMode] = useState<AIMode>('fast');
  
  return (
    <div>
      {/* 模式选择器 */}
      <div className="mode-selector">
        <button 
          onClick={() => setAIMode('fast')}
          className={aiMode === 'fast' ? 'active' : ''}
        >
          ⚡ Fast Mode
        </button>
        <button 
          onClick={() => setAIMode('thinking')}
          className={aiMode === 'thinking' ? 'active' : ''}
        >
          🧠 Thinking Mode
        </button>
      </div>
      
      {/* 传递模式到 API */}
      <ChatInterface 
        aiMode={aiMode}
        onAsk={(question) => askQuestion(question, aiMode)}
      />
    </div>
  );
}
```

### 2. API 层：动态模型选择

更新 API 端点以支持模式选择：

```typescript
// app/api/ai/video-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { question, videoContext, aiMode = 'fast' } = await req.json();
  
  // 根据用户选择的模式选择模型
  const model = aiMode === 'thinking' 
    ? process.env.OPEN_ROUTER_MODEL_THINKING 
    : process.env.OPEN_ROUTER_MODEL_FAST;
  
  const assistant = new VideoLearningAIAssistant({
    model,
    enableThinking: aiMode === 'thinking'
  });
  
  const response = await assistant.assistUser(
    question,
    videoContext,
    conversationHistory
  );
  
  return NextResponse.json(response);
}
```

### 3. LangChain 集成：Thinking Mode

更新 VideoLearningAIAssistant 类以支持 thinking mode：

```typescript
// lib/langChain/video-ai-assistant.ts
import { ChatOpenAI } from "@langchain/openai";

export class VideoLearningAIAssistant {
  private model: ChatOpenAI;
  private enableThinking: boolean;
  
  constructor(config: {
    model: string;
    enableThinking?: boolean;
  }) {
    this.enableThinking = config.enableThinking || false;
    
    this.model = new ChatOpenAI({
      modelName: config.model,
      openAIApiKey: getOpenRouterKey(),
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
      temperature: 0.7,
    });
  }
  
  async assistUser(
    question: string,
    videoContext: VideoContext,
    conversationHistory?: Array<any>
  ) {
    // Stage 1-3: 问题分析、证据收集、Web 搜索...
    
    // Stage 4: 答案合成
    const messages = this.buildMessages(
      question,
      evidence,
      conversationHistory
    );
    
    const response = await this.model.invoke(messages);
    
    // 如果启用 thinking，解析思考过程
    if (this.enableThinking) {
      return this.parseThinkingResponse(response.content);
    }
    
    return {
      content: response.content,
      suggestedActions: [],
      relatedConcepts: []
    };
  }
  
  private buildMessages(
    question: string,
    evidence: EvidenceGathering,
    conversationHistory?: Array<any>
  ) {
    const messages = [];
    
    // 如果启用 thinking，添加系统提示
    if (this.enableThinking) {
      messages.push({
        role: 'system',
        content: '<|think|>' // 启用 Gemma 4 thinking mode
      });
    }
    
    // 添加对话历史
    if (conversationHistory) {
      messages.push(...conversationHistory);
    }
    
    // 添加当前问题和证据
    messages.push({
      role: 'user',
      content: this.formatPrompt(question, evidence)
    });
    
    return messages;
  }
  
  private parseThinkingResponse(content: string) {
    // 提取 thinking 和 answer
    const thinkingMatch = content.match(
      /<\|channel>thought\n([\s\S]*?)<channel\|>/
    );
    
    const thinking = thinkingMatch ? thinkingMatch[1].trim() : '';
    const answer = content
      .replace(/<\|channel>thought[\s\S]*?<channel\|>/, '')
      .trim();
    
    return {
      thinking,  // 推理过程
      content: answer,  // 最终答案
      suggestedActions: this.extractActions(answer),
      relatedConcepts: this.extractConcepts(answer)
    };
  }
}
```

### 4. 结构化输出：视频分析

为视频片段分析添加结构化输出：

```typescript
// lib/langChain/video-ai-assistant.ts

interface VideoAnalysisSchema {
  summary: string;
  keyPoints: string[];
  topics: string[];
  confidence: number;
  timestamps?: Array<{
    time: number;
    description: string;
  }>;
}

async function analyzeVideoSegment(
  segmentText: string,
  model: string = process.env.OPEN_ROUTER_MODEL_FAST!
): Promise<VideoAnalysisSchema> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getOpenRouterKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `Analyze this video segment and extract key information:\n\n${segmentText}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'video_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: '视频片段的简洁摘要'
              },
              keyPoints: {
                type: 'array',
                items: { type: 'string' },
                description: '关键要点列表'
              },
              topics: {
                type: 'array',
                items: { type: 'string' },
                description: '涉及的主题标签'
              },
              confidence: {
                type: 'number',
                description: '分析置信度 (0-1)',
                minimum: 0,
                maximum: 1
              },
              timestamps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    time: { type: 'number' },
                    description: { type: 'string' }
                  },
                  required: ['time', 'description']
                },
                description: '重要时间点'
              }
            },
            required: ['summary', 'keyPoints', 'topics', 'confidence'],
            additionalProperties: false
          }
        }
      }
    })
  });
  
  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}
```

### 5. 前端：显示 Thinking 过程

在 UI 中展示推理过程：

```typescript
// components/course/video-ai-assistant.tsx

interface AIResponse {
  thinking?: string;  // 推理过程 (仅 thinking mode)
  content: string;    // 最终答案
  suggestedActions: string[];
  relatedConcepts: string[];
}

export function VideoAIAssistant({ ... }) {
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [showThinking, setShowThinking] = useState(true);
  
  return (
    <div>
      {response && (
        <div className="ai-response">
          {/* Thinking 过程 (可折叠) */}
          {response.thinking && (
            <details open={showThinking}>
              <summary className="thinking-header">
                🧠 Thinking Process
              </summary>
              <div className="thinking-content">
                <pre>{response.thinking}</pre>
              </div>
            </details>
          )}
          
          {/* 最终答案 */}
          <div className="answer-content">
            <h3>Answer</h3>
            <div dangerouslySetInnerHTML={{ __html: response.content }} />
          </div>
          
          {/* 建议操作 */}
          {response.suggestedActions.length > 0 && (
            <div className="suggested-actions">
              <h4>Suggested Actions</h4>
              <ul>
                {response.suggestedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6. 流式响应：Thinking Mode

支持流式显示 thinking 过程：

```typescript
// hooks/course/use-video-ai.ts

export function useStreamingVideoAI(videoContext: VideoContext) {
  async function* askStreaming(
    question: string,
    aiMode: 'fast' | 'thinking' = 'fast'
  ) {
    const response = await fetch('/api/ai/video-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        videoContext,
        aiMode,
        stream: true
      })
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    let inThinkingBlock = false;
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // 检测 thinking 块
      if (buffer.includes('<|channel>thought')) {
        inThinkingBlock = true;
        yield { type: 'thinking_start' };
      }
      
      if (buffer.includes('<channel|>')) {
        inThinkingBlock = false;
        yield { type: 'thinking_end' };
        buffer = buffer.split('<channel|>')[1];
      }
      
      // 流式输出
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            yield {
              type: inThinkingBlock ? 'thinking_token' : 'answer_token',
              content: line
            };
          }
        }
      }
    }
  }
  
  return { askStreaming };
}
```

### 7. 环境变量验证

添加启动时的配置验证：

```typescript
// lib/config/validate-env.ts

export function validateAIConfig() {
  const required = [
    'OPEN_ROUTER_MODEL_FAST',
    'OPEN_ROUTER_MODEL_THINKING',
    'OPEN_ROUTER_KEY_1'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required AI configuration: ${missing.join(', ')}`
    );
  }
  
  console.log('✅ AI Configuration validated');
  console.log(`   Fast Model: ${process.env.OPEN_ROUTER_MODEL_FAST}`);
  console.log(`   Thinking Model: ${process.env.OPEN_ROUTER_MODEL_THINKING}`);
}
```

### 8. 测试示例

```typescript
// __tests__/ai/gemma-4-integration.test.ts

describe('Gemma 4 Integration', () => {
  it('should use fast model when mode is fast', async () => {
    const response = await fetch('/api/ai/video-assistant', {
      method: 'POST',
      body: JSON.stringify({
        question: 'What is this video about?',
        videoContext: { ... },
        aiMode: 'fast'
      })
    });
    
    const data = await response.json();
    expect(data.thinking).toBeUndefined();
    expect(data.content).toBeDefined();
  });
  
  it('should use thinking model and return reasoning', async () => {
    const response = await fetch('/api/ai/video-assistant', {
      method: 'POST',
      body: JSON.stringify({
        question: 'Explain this complex concept',
        videoContext: { ... },
        aiMode: 'thinking'
      })
    });
    
    const data = await response.json();
    expect(data.thinking).toBeDefined();
    expect(data.content).toBeDefined();
  });
  
  it('should return structured JSON for video analysis', async () => {
    const analysis = await analyzeVideoSegment('...');
    
    expect(analysis).toMatchObject({
      summary: expect.any(String),
      keyPoints: expect.any(Array),
      topics: expect.any(Array),
      confidence: expect.any(Number)
    });
    
    expect(analysis.confidence).toBeGreaterThanOrEqual(0);
    expect(analysis.confidence).toBeLessThanOrEqual(1);
  });
});
```

---

## 配置和环境变量

### 必需变量
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# OpenRouter (仅需两个模型)
OPEN_ROUTER_MODEL_FAST=google/gemma-4-26b-a4b-it:free
OPEN_ROUTER_MODEL_THINKING=google/gemma-4-31b-it:free
OPEN_ROUTER_KEY_1=

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

# 模型选择 (仅需两个模型)
OPEN_ROUTER_MODEL_FAST=google/gemma-4-26b-a4b-it:free  # 快速模式
OPEN_ROUTER_MODEL_THINKING=google/gemma-4-31b-it:free  # 思考模式
```

---

## Home 页面的 4 个 AI 功能

系统提供 4 个核心 AI 功能，全部支持 Fast 和 Thinking 两种模式：

### 1. AI Summary (社区内容摘要) 📊
**API**: `POST /api/ai/summary`
**功能**: 智能总结社区帖子和搜索结果

**特性**:
- 搜索模式：总结多个帖子
- 帖子模式：深度分析单个帖子
- 支持中英文
- 自动提取关键要点和主题
- 生成引用来源

**使用场景**:
- Fast Mode: 快速浏览社区讨论摘要
- Thinking Mode: 深度分析帖子内容和评论

**请求示例**:
```typescript
{
  "mode": "search",
  "query": "machine learning",
  "locale": "en",
  "aiMode": "fast", // 或 "thinking"
  "maxItems": 10
}
```

**响应格式** (结构化输出):
```typescript
{
  "success": true,
  "bullets": ["Key point 1", "Key point 2", ...],
  "themes": ["Theme 1", "Theme 2", ...],
  "citations": [
    {
      "postId": 123,
      "title": "Post title",
      "relevance": 0.95
    }
  ],
  "thinking": "...", // 仅 thinking mode
  "meta": {
    "model": "google/gemma-4-26b-a4b-it:free",
    "processingTimeMs": 1500
  }
}
```

---

### 2. AI Analyze (内容分析) 🔍
**API**: `POST /api/ai/analyze`
**功能**: 分析课程内容、生成笔记、解决问题

**分析类型**:
- `summary`: 内容总结
- `topics`: 主题提取
- `questions`: 生成问题
- `notes`: 生成学习笔记
- `problem_solving`: 问题求解 (支持图像)
- `learning_path`: 学习路径规划

**特性**:
- 支持文本和图像输入 (多模态)
- 工具调用集成 (搜索、课程数据)
- 个性化推荐
- 结构化输出

**使用场景**:
- Fast Mode: 快速总结、主题提取
- Thinking Mode: 复杂问题求解、学习路径规划

**请求示例** (文本):
```typescript
{
  "content": "Explain quantum computing...",
  "analysisType": "summary",
  "aiMode": "fast",
  "includeRecommendations": true
}
```

**请求示例** (图像):
```typescript
// FormData
const formData = new FormData();
formData.append('image', imageFile);
formData.append('content', 'Solve this math problem');
formData.append('analysisType', 'problem_solving');
formData.append('aiMode', 'thinking'); // 展示解题步骤
```

**响应格式**:
```typescript
{
  "success": true,
  "type": "problem_solving",
  "analysis": "Detailed analysis...",
  "thinking": "Step 1: ...\nStep 2: ...", // 仅 thinking mode
  "recommendations": [
    {
      "type": "course",
      "title": "Advanced Math",
      "relevance": 0.9
    }
  ],
  "toolsUsed": ["search", "get_course_data"],
  "confidence": 0.95
}
```

---

### 3. AI Detect/Classify (AI 内容检测) 🛡️
**API**: `POST /api/ai/detect-classify`
**功能**: 检测文本是否由 AI 生成

**特性**:
- 三分类：Human-Written / AI-Generated / Paraphrased
- 置信度评分
- 风险等级评估
- AI 特征指标
- 支持文本和附件

**使用场景**:
- 作业提交审查
- 学术诚信检查
- 内容原创性验证

**请求示例**:
```typescript
{
  "text": "Student submission text...",
  // 通常使用 fast mode 即可
}
```

**响应格式** (结构化输出):
```typescript
{
  "classification": "human" | "ai_generated" | "paraphrased",
  "confidence": 0.95,
  "probabilities": {
    "human": 0.85,
    "ai_generated": 0.10,
    "paraphrased": 0.05
  },
  "analysis": {
    "risk_level": "low" | "medium" | "high",
    "ai_indicators": ["indicator1", "indicator2"],
    "has_ai_traces": false,
    "secondary_judgment": {
      "triggered": false,
      "reasons": []
    }
  },
  "suggestions": [
    "Content appears to be human-written",
    "No significant AI characteristics detected"
  ],
  "processing_time": 850,
  "text_hash": "abc123..."
}
```

**二次判断逻辑**:
即使主分类为 "human"，系统也会检查：
- AI 概率 > 1%
- Paraphrased 概率 > 5%
- 风险等级不是 "low"
- 存在 AI 指标

如果满足任一条件，`has_ai_traces` 为 `true`，建议人工复审。

---

### 4. AI Generate Quiz (AI 生成测验) 📝
**API**: `POST /api/ai/generate-quiz`
**功能**: 根据主题自动生成测验题目

**题目类型**:
- `multiple_choice`: 选择题 (4 个选项)
- `true_false`: 判断题
- `short_answer`: 简答题
- `essay`: 论述题
- `fill_blank`: 填空题

**难度等级**:
- 1: Beginner (Easy)
- 2: Intermediate (Medium)
- 3: Advanced (Hard)
- 4: Expert (Very Hard)
- 5: Master (Extremely Hard)

**特性**:
- 结构化输出 (100% 有效 JSON)
- 自动生成解释
- 工具调用集成 (搜索课程内容)
- 支持自定义指令
- 基于课程内容生成

**使用场景**:
- Fast Mode: 快速生成基础练习题
- Thinking Mode: 生成深入题目和详细解释

**请求示例**:
```typescript
{
  "topic": "JavaScript Promises",
  "num_questions": 5,
  "difficulty": 2,
  "question_types": ["multiple_choice", "true_false"],
  "include_explanations": true,
  "aiMode": "fast", // 或 "thinking"
  "lesson_content": "Optional: base content...",
  "custom_instructions": "Focus on async/await"
}
```

**响应格式** (结构化输出):
```typescript
{
  "success": true,
  "quiz": {
    "title": "Quiz: JavaScript Promises",
    "description": "Test your understanding of asynchronous JavaScript",
    "total_points": 10,
    "estimated_time_minutes": 10,
    "questions": [
      {
        "id": "q1",
        "question_text": "What is a Promise in JavaScript?",
        "question_type": "multiple_choice",
        "options": [
          "An object representing eventual completion",
          "A synchronous function",
          "A callback function",
          "A loop construct"
        ],
        "correct_answer": "An object representing eventual completion",
        "explanation": "A Promise is an object that represents...",
        "points": 2,
        "difficulty": 2,
        "position": 1
      },
      {
        "id": "q2",
        "question_text": "Promises can only be resolved once.",
        "question_type": "true_false",
        "options": [],
        "correct_answer": true,
        "explanation": "Once a Promise is settled...",
        "points": 1,
        "difficulty": 1,
        "position": 2
      }
    ]
  },
  "thinking": "...", // 仅 thinking mode
  "metadata": {
    "aiGenerated": true,
    "model": "google/gemma-4-26b-a4b-it:free",
    "toolsUsed": ["get_course_data", "search"],
    "processingTimeMs": 3500
  }
}
```

**结构化输出保证**:
- ✅ 所有题目都有必需字段
- ✅ 选择题恰好 4 个选项
- ✅ 判断题 `correct_answer` 是 boolean
- ✅ `correct_answer` 与选项完全匹配
- ✅ 无额外或缺失字段

---

## 4 个 AI 功能对比

| 功能 | 主要用途 | 输入类型 | 推荐模式 | 结构化输出 |
|------|---------|---------|---------|-----------|
| **AI Summary** | 社区内容总结 | 文本 | Fast | ✅ |
| **AI Analyze** | 内容分析、问题求解 | 文本、图像 | Thinking | ✅ |
| **AI Detect** | AI 内容检测 | 文本 | Fast | ✅ |
| **AI Generate Quiz** | 生成测验题目 | 文本 | Fast/Thinking | ✅ |

---

## 快速参考：Gemma 4 API 调用

### Fast Mode (快速响应)

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPEN_ROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-26b-a4b-it:free",
    "messages": [
      {"role": "user", "content": "Explain this concept briefly"}
    ]
  }'
```

### Thinking Mode (推理模式)

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPEN_ROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-31b-it:free",
    "messages": [
      {"role": "system", "content": "<|think|>"},
      {"role": "user", "content": "Solve this problem step by step"}
    ]
  }'
```

### Structured Output (结构化输出)

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPEN_ROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-31b-it:free",
    "messages": [
      {"role": "user", "content": "Analyze this video segment"}
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "video_analysis",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "summary": {"type": "string"},
            "keyPoints": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1}
          },
          "required": ["summary", "keyPoints", "confidence"],
          "additionalProperties": false
        }
      }
    }
  }'
```

### Multimodal (多模态 - 图像)

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPEN_ROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-31b-it:free",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "What is in this image?"},
          {"type": "image_url", "image_url": {"url": "https://..."}}
        ]
      }
    ]
  }'
```

### 模型选择决策树

```
用户提问
    │
    ├─ 需要快速响应？
    │   └─ YES → Fast Mode (gemma-4-26b-a4b-it:free)
    │       ├─ 日常问答
    │       ├─ 内容总结
    │       ├─ 简单解释
    │       └─ 多模态输入 (文本/图像/视频)
    │
    └─ 需要看推理过程？
        └─ YES → Thinking Mode (gemma-4-31b-it:free)
            ├─ 复杂推理
            ├─ 数学问题
            ├─ 代码分析
            ├─ 多步骤问题
            └─ 多模态输入 (文本/图像)

注意：两个模型都支持：
  ✅ 结构化输出 (JSON Schema)
  ✅ Function Calling
  ✅ 256K 上下文窗口
  ✅ 多模态输入
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

### Google Gemma 4 升级亮点 ✨

**新增功能**:
- ⚡ **Fast Mode**: 使用 Gemma 4 26B A4B (MoE) 实现极速响应
- 🧠 **Thinking Mode**: 使用 Gemma 4 31B 展示完整推理过程
- 📋 **结构化输出**: 100% 可靠的 JSON Schema 响应
- 🎯 **多模态支持**: 文本、图像、视频输入
- 🌐 **256K 上下文**: 支持超长对话和文档

**性能提升**:
- MoE 架构：仅激活 15% 参数，速度提升 3-5 倍
- 原生 Function Calling：无需额外提示工程
- 多语言支持：140+ 语言

**用户体验**:
- 用户可自由选择 Fast 或 Thinking 模式
- Thinking 模式展示 AI 推理步骤，提高透明度
- 结构化输出确保数据一致性和可靠性

整个系统设计注重性能、准确度和用户体验的平衡，通过 Google Gemma 4 的强大能力，为用户提供更智能、更透明的学习助手体验。
