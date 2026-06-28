# Studify RAG 流程审查与修复记录

> 审查日期：2026-06-28  
> 范围：PDF RAG、视频/字幕 RAG、通用内容 embedding、检索融合、上下文拼接与回答生成  
> 状态说明：文中的“已解决”表示代码或 Supabase migration 已完成；“待部署/待重建”不代表生产数据已经更新。

## 1. 当前实际存在的 RAG 流程

Studify 目前不是单一 RAG，而是三条部分重叠的流程。

### 1.1 视频处理主流程

```text
视频/音频
  → Whisper 转录
  → faster-whisper 原生 timestamp segments
  → Whisper 容器调用 E5-small + BGE-M3
  → Supabase 事务型 RPC 原子替换 video_embeddings
  → Whisper 更新 processing queue/steps
  → 视频专用检索 RPC
  → QA evidence
  → LLM
```

主要代码：

- `app/api/video-processing/steps/transcribe/route.ts`
- `app/api/video-processing/steps/embed/route.ts`
- `lib/video-processing/segment-processor.ts`
- `lib/langChain/tools/search-tool.ts`
- `app/api/video/qa/route.ts`

### 1.2 PDF RAG

```text
course_attachments 中的 PDF
  → 下载 PDF
  → 按真实页面提取文本
  → paragraph chunk
  → E5-small + BGE-M3 embedding
  → document_embeddings
  → Dense + Full-text + RRF
  → QA evidence
  → LLM
```

主要代码：

- `lib/pdf-processing/pdf-processing-queue.ts`
- `lib/pdf-processing/pdf-extractor.ts`
- `lib/pdf-processing/pdf-embedding-generator.ts`
- `db/migrations/create_document_embeddings.sql`
- `db/migrations/20260628_add_document_hybrid_search.sql`

### 1.3 通用内容 embedding

```text
profile/course/post/lesson/note/video_segment 等
  → embedding_queue
  → SemanticChunker
  → embeddings
  → smartSearch / 通用 retriever
```

主要代码：

- `lib/langChain/vectorstore.ts`
- `lib/langChain/semantic-chunking.ts`
- `lib/langChain/retrievers.ts`
- `lib/langChain/langchain-integration.ts`

这条通用流程与视频专用 `video_embeddings` 并不完全统一，仍是后续需要收敛的重点。

---

## 2. 已解决的问题

### 2.1 PDF E5 向量维度错误

原来 PDF 表和生成器要求 E5 为 768 维，但项目实际模型是
`intfloat/e5-small`，输出 384 维。这会导致 PDF embedding 在校验或写库阶段失败。

已完成：

- PDF generator 改为校验 384 维。
- `document_embeddings.embedding_e5` 改为 `vector(384)`。
- PDF 检索 RPC 参数改为 `vector(384)`。
- Supabase 线上已经创建正确的表与函数。

线上当前字段：

| 字段 | 类型 |
|---|---|
| `embedding_e5` | `vector(384)` |
| `embedding_bge_m3` | `vector(1024)` |
| `search_vector` | `tsvector` |

### 2.2 线上缺少 `document_embeddings`

审查时发现线上数据库根本不存在该表，所以之前的 PDF RAG 实际没有可用的独立索引存储。

已在线上执行：

- `create_document_embeddings_384`
- `add_document_hybrid_search`

对应 Supabase migration 版本：

- `20260628112803`
- `20260628113013`

### 2.3 MEGA PDF 下载方式错误

现有 12 个 PDF attachment 全部使用 MEGA URL。原代码用普通 `fetch()` 下载，
得到的可能是 MEGA HTML 页面，而不是 PDF 文件。

已解决：

- MEGA URL 改用已有的 `downloadMegaFile()`。
- 非 MEGA URL 才使用普通 HTTP fetch。
- 修正查询不存在的 `file_size` 字段，使用真实字段 `size`。

### 2.4 PDF 页码是推算值

原实现使用 chunk 序号与动态 chunk 数量推测页码，引用页码并不可信。

已解决：

- 优先使用 `pdf-parse` 返回的真实 page。
- 在每个真实页面内部生成 paragraph chunks。
- 无 page 数据时不再伪造分布，只明确回退为 page 1。

### 2.5 中文 chunk 大小计算失真

原代码通过空格统计 word count。中文没有天然空格，一整页中文可能被当成一个词。

已解决：

- CJK 字符与非 CJK 单词分别计数。
- overlap 同样使用语言感知的文本单元。

注意：这仍是近似 size unit，不等于模型 tokenizer token 数。最终应统一为模型 tokenizer。

### 2.6 文档和视频尾部内容被丢弃

原逻辑在最后一个 chunk 小于 `minChunkSize` 时直接丢弃，容易丢掉总结、定义或短视频全文。

已解决：

- 有前一个 chunk 时合并短尾段。
- 整份内容本身很短时保留为唯一 chunk。

### 2.7 “SemanticChunker”原来没有语义切分

原实现只按换行、标点和字符长度递归切分：

- `similarityThreshold` 没有使用。
- `cosineSimilarity` 没有使用。
- 名称与行为不一致。

已解决：

- 先生成 paragraph/sentence semantic units。
- 批量生成相邻单元的 E5 embeddings。
- 根据相邻 embedding cosine similarity 决定 breakpoint。
- embedding 服务失败时保留结构化 fallback。
- overlap 优先使用完整句子，不再直接截断半句话。

代价：

- ingestion 会额外进行一次 E5 batch 请求。
- 当前阈值 `0.7` 尚未通过真实数据集校准。

### 2.8 视频 individual fallback 生成成功却被判失败

batch 返回字段是 `has_e5/has_bge`，individual fallback 返回的是
`e5_success/bge_success`，外层只识别前一种格式。

已解决：

- individual fallback 统一映射成 batch 的内部结构。

### 2.9 视频重试产生重复 embeddings

QStash retry 可能反复向 `video_embeddings` 插入同一 attachment 的 segments 和 summary。

已缓解：

- 新 embedding 全部准备完成后，替换该 attachment 的旧 segment/summary。

仍有风险：

- 删除与重新插入不是数据库事务。
- 删除成功、插入失败时会形成短暂或持续的数据空窗。

### 2.10 支持真实 ASR timestamps

已新增：

- `transcription_segments[]` 输入结构。
- 每项包含 `text/start/end/confidence/speaker`。
- chunk 时间来自首尾 ASR segment，不再依赖字数推算。
- retry 会继续携带 timestamped segments。

Whisper 服务现已改为直接消费 faster-whisper 原生 segment timestamps，
并在自己的长生命周期容器中完成 embedding 与数据库 CRUD，从而避开 Vercel
单次执行时间限制。Studify 的旧 embed endpoint 仍保留作兼容 fallback。

### 2.11 PDF 没有进入视频课程 QA

视频 QA 原来只请求：

```text
video_segment, lesson, note
```

已解决：

- 增加 `document_segment`。
- PDF attachment 独立解析，不再错误复用视频 attachment ID。

### 2.12 Prompt 中重复塞入整份搜索 JSON

原 evidence 同时包含：

- `message` 中的截断结果；
- `results` 中的完整结果；
- 重复 metadata 和 overlap chunks。

已解决：

- evidence 进入模型前去重。
- 限制结果数量、单结果字符数和总字符数。
- 分配稳定的 `source_id`。
- 去掉重复的格式化 message。
- RRF 排序分数与 cosine confidence 分开，避免把 `0.03` 的 RRF 当成 3% 置信度。

### 2.13 课程证据不足时错误使用 Web

过去内部检索置信度低就可能自动搜索 Web。Web 可以解释一般知识，但不能证明老师在课程里说过什么。

已解决：

- course/lesson/video/transcript 特定问题缺证据时，不自动用 Web 替代。
- 对时效性问题仍允许 Web 补充。

### 2.14 PDF hybrid retrieval

已上线：

- E5 dense candidate retrieval。
- PostgreSQL full-text lexical retrieval。
- GIN index。
- Reciprocal Rank Fusion。
- BGE similarity 作为附加排序信号。

当前按用户要求，cross-encoder reranker 未集成；相关预留分支也已移除，
当前流程明确停在 dense + lexical + RRF + BGE dense score。

### 2.15 修复 E5 query/passage 契约

E5 server 原来默认 `task=query`，而 ingestion 调用没有传 task，导致视频、
PDF 和通用内容可能全部使用 `query:` 前缀生成 passage embeddings。

已解决：

- 服务端默认改为更安全的 `passage`。
- 所有服务端检索请求显式传 `query`。
- 所有 ingestion、semantic units 和 Whisper segment 显式传 `passage`。
- 浏览器 Fast/Thinking 模式的 E5 query 同样加入 `query:`。
- embedding cache key 包含 purpose，避免 query/passage 缓存串用。

两个 embedding server 的 AutoModel fallback 也已修复：

- attention-mask-aware mean pooling；
- L2 normalization；
- truncation/max length；
- `.to(DEVICE)`、`eval()` 与 inference mode；
- 同步 PyTorch 移入 worker thread，避免阻塞 FastAPI event loop；
- batch size 与输出维度校验；
- 模型不可用时返回正确 HTTP 5xx。

重要：历史 E5 rows 很可能使用错误的 query prefix，部署新 embedding server
和调用端后必须重建历史 E5 embeddings，不能把新 query vectors 与旧 passage
vectors 混用。

---

## 3. 仍然存在的问题

### P0：旧视频 ingestion 路径仍与主检索表断开

`/api/video/process-transcript`：

```text
video_segments → embedding_queue → embeddings
```

视频 QA 查询：

```text
video_embeddings
```

这意味着从旧入口处理的 transcript 仍可能无法被视频 QA 找到。

建议：

1. 禁用旧入口；或
2. 让旧入口统一投递到正式 video-processing/embed job；或
3. 视频检索同时兼容通用 `embeddings`，但这会继续扩大双写复杂度。

首选方案是 1 + 2。

### P0：PDF embeddings 尚未重建

线上已有 12 个 PDF attachments，但新建的 `document_embeddings` 当前为空。

必须先部署本次代码，再重新处理：

```text
3, 14, 15, 16, 17, 18, 90, 91, 92, 93, 94, 95
```

不能在部署前触发：

- 旧生产代码仍会错误下载 MEGA 页面。
- 旧生产代码仍按 768 维校验 E5。

### P0：PDF background job 使用进程内 Map

`pdf-processing-queue.ts` 使用：

```ts
const jobs = new Map()
```

并通过不等待的 background Promise 执行。对于 Vercel/serverless：

- 请求结束后实例可能被冻结或回收；
- job 状态会随实例消失；
- 多实例无法共享状态；
- 大 PDF 很容易处理中断。

建议：

- 使用数据库 `pdf_processing_jobs` 表；
- 通过 QStash/worker 按 extraction、embedding batch 分阶段处理；
- 每个 batch 可重试且幂等。

### P0：视频替换索引不是事务

当前逻辑：

```text
生成新 embeddings
→ DELETE 旧索引
→ INSERT 新索引
```

应改为：

- 写入带 `index_version` 的 staging rows；
- 完成后原子切换 active version；
- 最后异步删除旧版本。

这样 QA 始终至少能看到一套完整索引。

### 已解决：ASR 服务返回并持久化真实 segments

Whisper 服务现在使用并持久化类似：

```json
{
  "text": "...",
  "segments": [
    {
      "text": "...",
      "start": 12.4,
      "end": 16.8,
      "confidence": 0.94
    }
  ]
}
```

QStash 只负责触发 Whisper；Whisper 完成长任务并通过受限的事务 RPC
原子替换视频索引，不再等待或回调 Vercel 执行长任务。

### P1：只搜索 lesson 的第一个 PDF

`searchDocumentEmbeddings()` 使用 `.limit(1)` 选择 PDF attachment。

如果一个 lesson 有多份讲义：

- 其余 PDF 永远不参与检索；
- 用户无法知道检索范围不完整。

应支持：

- 获取 lesson 的全部 PDF attachment IDs；
- RPC 接收 `bigint[]`；
- 在所有 attachment 上统一召回和排序。

### P1：所谓 summary 其实是截断后的全文 embedding

视频流程把完整 transcript 作为 summary 写入，但 embedding preprocessing 会截断到 8000 字符。

问题：

- 它不是摘要；
- 长视频只表示开头部分；
- metadata 却声称代表完整 transcription。

建议：

- 生成真实 hierarchical summary；
- 每章节生成 section summary；
- 全视频生成 global summary；
- 保留摘要模型、版本及覆盖 segment IDs。

### P1：E5 query/document prefix 没有显式契约

E5 系列通常要求区分 query 与 passage。当前统一调用：

```ts
generateEmbedding(text, 'e5')
```

需要确认 embedding server 是否已自动添加：

- `query:`
- `passage:`

如果服务端没有处理，应在客户端 API 中显式加入 embedding purpose，随后全量重建索引。

### P1：中文 lexical retrieval 能力有限

PostgreSQL `simple` tsvector 对英文关键词有用，但不会进行理想的中文分词。

当前 hybrid 对中文主要仍依赖 dense retrieval。

后续可选：

- PGroonga；
- `zhparser`；
- 应用层生成 CJK bigram search tokens；
- 外部 OpenSearch/Elasticsearch。

### P1：Semantic chunking 成本翻倍

真正的 semantic breakpoint 需要先为 units 生成一次 E5 embeddings，最终 chunks 又会生成 E5+BGE。

可优化：

- 缓存 unit embeddings；
- 合并后通过加权 pooling 复用 E5；
- 只为长文档启用 semantic breakpoint；
- 短内容使用结构化 splitter。

### P1：固定阈值未校准

目前存在多组固定值：

- semantic breakpoint：`0.7`
- video E5：`0.45/0.5`
- 通用 search：`0.7`
- retriever：`0.7/0.76/0.8`

这些分数不能跨模型和内容类型直接比较。

需要建立评测集后分别校准：

- 视频问答；
- PDF 定位；
- 中文/英文；
- 精确术语/概念问答；
- 有答案/无答案。

### P1：检索 confidence 仍不是答案可信度

当前 confidence 主要来自 top results similarity。它不能判断：

- evidence 是否真的回答问题；
- chunks 是否互相冲突；
- LLM 是否忠实使用 evidence；
- 引用是否支持具体 claim。

后续应增加：

- answerability classifier；
- citation entailment；
- no-answer threshold；
- claim-level source verification。

### P2：视频 vector indexes 重复

线上 `video_embeddings` 存在多组功能相近的 E5/BGE IVFFlat indexes。

影响：

- 写入成本增加；
- 存储浪费；
- planner 维护复杂。

应通过 `pg_stat_user_indexes` 确认使用率后再删除，不能仅凭名称直接删除。

### P2：PDF dense vector index 尚未创建

当前 PDF 表为空，因此 dense search 暂时是顺序扫描。

数据重建后应根据规模选择：

- 小数据量：顺序扫描可能更快；
- 中大型数据：HNSW；
- IVFFlat 需要合理训练数据与 lists 参数。

不要在只有少量 rows 时盲目创建 IVFFlat。

### P0 安全问题：大量表未启用 RLS

Supabase 检查发现 public schema 有 146 张表未启用 RLS，其中包括：

- `embeddings`
- `video_embeddings`
- `embedding_queue`
- `video_processing_queue`
- 课程、用户和聊天相关表

风险：

- anon/authenticated 客户端可能绕过应用 API 直接读写数据。

不能直接对 146 张表执行 `ENABLE ROW LEVEL SECURITY`：

- 没有 policy 时会立即阻断合法业务。

应独立进行：

1. 记录每张表的访问角色。
2. 先为关键表编写 policies。
3. 在测试环境启用 RLS。
4. 跑完整业务回归。
5. 分批上线。

---

## 4. 推荐上线顺序

### 阶段 A：部署本次代码

部署前检查：

```bash
npx tsc --noEmit
```

部署内容至少包括：

- PDF 384 维修复；
- MEGA 下载；
- page-aware extraction；
- timestamped ASR consumer；
- semantic breakpoint；
- hybrid search；
- prompt evidence budget。

### 阶段 B：重建 PDF

部署后重新处理 12 个 PDF，并持续检查：

```sql
SELECT
  attachment_id,
  count(*) AS chunks,
  count(*) FILTER (WHERE status = 'completed') AS completed,
  count(*) FILTER (WHERE has_e5_embedding) AS e5,
  count(*) FILTER (WHERE has_bge_embedding) AS bge,
  count(*) FILTER (WHERE status = 'failed') AS failed
FROM document_embeddings
GROUP BY attachment_id
ORDER BY attachment_id;
```

完成标准：

- 每个 attachment 至少有一个 chunk；
- `failed = 0`；
- E5/BGE 数量与 completed chunks 一致；
- 随机抽查 page number 与 PDF 原页一致。

### 阶段 C：验证 retrieval

至少测试：

1. 精确引用 PDF 中的一句话。
2. 搜索专有名词。
3. 中文概念问题。
4. 同 lesson 视频与 PDF 同时有答案。
5. 无答案问题。
6. 当前播放时间附近的问题。

记录：

- top-k chunks；
- dense score；
- lexical score；
- RRF score；
-最终 prompt evidence；
-回答中的 source/page/timestamp。

### 阶段 D：修复旧视频入口和 ASR provider

优先顺序：

1. 统一 `/api/video/process-transcript` 与正式 video pipeline。
2. 部署并验证新的 Whisper 容器。
3. 在真实课程上校准 semantic chunk 和 retrieval threshold。

### 阶段 E：建立 RAG eval

最小评测指标：

| 环节 | 指标 |
|---|---|
| Recall | Recall@5、Recall@10 |
| Ranking | MRR、nDCG@10 |
| Answer | Faithfulness、answer relevance |
| Citation | page/timestamp precision |
| No-answer | precision、recall |
| 系统 | latency、embedding cost、LLM tokens |

---

## 5. 当前结论

本次修复已经让 PDF RAG 从“线上无表、维度错误、MEGA 无法下载”的不可运行状态，
进入可以部署并重建数据的状态；视频 RAG 也修复了 fallback、重复写入和 timestamps
消费接口；检索侧已经有 dense + lexical + RRF，prompt 侧也不再无预算地重复拼接 JSON。

但系统仍未完全收敛。当前最重要的三个后续任务是：

1. 部署后可靠地重建并验证 12 个 PDF；
2. 合并旧视频 ingestion 与 `video_embeddings` 主路径；
3. 移除或重定向仍然写入通用 `embeddings` 的旧视频入口。

在完成这三项之前，不应把页面引用、视频时间引用和所有入口的课程检索视为完全可靠。
