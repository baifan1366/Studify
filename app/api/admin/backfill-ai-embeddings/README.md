# Backfill AI Embeddings API

批量为 AI 活动内容触发向量化的 API endpoint。

## Endpoint

```
POST /api/admin/backfill-ai-embeddings
```

## 认证

需要以下角色之一：
- `student`
- `tutor`
- `admin`

## 请求参数

```typescript
{
  content_types?: string[];  // 可选，默认处理全部四种类型
  user_id?: number;          // 可选，只回填指定用户的数据
  batch_size?: number;       // 可选，默认 50
}
```

### content_types 支持的值

- `ai_quick_qa_session` - AI 快速问答会话
- `mistake_book` - 错题本
- `course_note` - 课程笔记
- `ai_workflow_template` - AI 工作流模板

## 响应格式

```json
{
  "success": true,
  "queued": {
    "ai_quick_qa_session": 12,
    "mistake_book": 5,
    "course_note": 8,
    "ai_workflow_template": 3
  }
}
```

## 使用示例

### 1. 回填所有类型的所有用户数据

```bash
curl -X POST http://localhost:3000/api/admin/backfill-ai-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

### 2. 只回填特定类型

```bash
curl -X POST http://localhost:3000/api/admin/backfill-ai-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content_types": ["ai_quick_qa_session", "mistake_book"]
  }'
```

### 3. 只回填特定用户的数据

```bash
curl -X POST http://localhost:3000/api/admin/backfill-ai-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 123,
    "batch_size": 100
  }'
```

### 4. 自定义批次大小

```bash
curl -X POST http://localhost:3000/api/admin/backfill-ai-embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content_types": ["course_note"],
    "batch_size": 20
  }'
```

## 工作原理

1. 对每种 `content_type`，查询对应的表（如 `ai_quick_qa_sessions`）
2. 过滤掉已经有 embedding 的记录（通过 `embeddings` 表检查）
3. 按创建时间倒序排列，取前 N 条（N = batch_size）
4. 对每条记录调用 `queue_for_embedding()` 函数，将其加入 embedding 队列
5. 返回每种类型实际加入队列的记录数

## 验证

调用 API 后，可以通过以下方式验证：

1. 检查 `embeddings` 表中是否出现新记录：
```sql
SELECT content_type, COUNT(*) 
FROM embeddings 
WHERE content_type IN ('ai_quick_qa_session', 'mistake_book', 'course_note', 'ai_workflow_template')
GROUP BY content_type;
```

2. 调用 `/api/community/recommendations` 查看：
   - `debug_info.ai_activity_vector_available: true`
   - `debug_info.scoring_breakdown.embedding_search_results > 0`

## 注意事项

- 批次大小建议不超过 100，避免请求超时
- 如果数据量很大，可以多次调用 API
- 优先级设置：
  - `mistake_book`: 2（高优先级）
  - `ai_workflow_template`: 2（高优先级）
  - `course_note`: 4（中等优先级）
  - `ai_quick_qa_session`: 6（低优先级）
