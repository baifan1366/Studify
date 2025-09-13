# Studify Embedding 系统流程说明

## 概述
Studify 使用向量嵌入(Embedding)来实现语义搜索功能。当用户创建内容（评论、帖子、课程等）时，系统会自动生成向量表示，用于后续的智能搜索。

## 系统架构

```
用户创建内容 → 数据库触发器 → 队列系统 → 处理器 → 向量存储
     ↓              ↓           ↓         ↓         ↓
  评论/帖子      自动排队    QStash调度   生成embedding  搜索功能
```

## 详细流程

### 1. 内容创建阶段
```
用户操作: 发表评论/帖子/创建课程
    ↓
数据库: 插入新记录到相应表 (community_comment, community_post, course等)
    ↓
触发器: 数据库自动调用 queue_for_embedding() 函数
    ↓
队列表: 新任务插入到 embedding_queue 表
```

**状态**: `queued` (排队等待)

### 2. 任务分发阶段
```
QStash调度器: 每小时调用 /api/embeddings/queue-monitor
    ↓
队列监控: 获取所有 status='queued' 的任务
    ↓
批量发送: 通过QStash发送webhook到 /api/embeddings/process-webhook
```

**QStash请求示例**:
```json
{
  "contentType": "comment",
  "contentId": 15,
  "priority": 5,
  "timestamp": 1757669717841
}
```

### 3. 任务处理阶段

#### 高优先级任务 (priority ≤ 2)
```
process-webhook接收 → 立即处理 → 生成embedding → 存储到数据库
```

#### 低优先级任务 (priority > 2)
```
process-webhook接收 → 加入队列 → 等待定时处理
    ↓
QStash定时调用queue-monitor → 批量处理 → 生成embedding
```

### 4. Embedding生成过程
```
1. 获取内容文本 (extract_content_text函数)
2. 调用外部embedding服务器
3. 生成384维向量
4. 存储到embeddings表
5. 更新队列状态为'completed'
```

## 关键组件说明

### API端点

| 端点 | 方法 | 功能 | 调用者 |
|------|------|------|--------|
| `/api/embeddings/process-webhook` | POST | 处理单个embedding任务 | QStash |
| `/api/embeddings/queue-monitor` | POST | 批量处理队列任务 | QStash定时器 |
| `/api/embeddings/queue-monitor` | GET | 查看队列统计信息 | 管理员 |
| `/api/embeddings/processor` | POST | 手动控制处理器 | 管理员 |

### 数据库表

| 表名 | 用途 |
|------|------|
| `embedding_queue` | 待处理任务队列 |
| `embeddings` | 生成的向量数据 |
| `community_comment` | 评论内容 |
| `community_post` | 帖子内容 |
| `course` | 课程内容 |

### 任务状态流转

```
queued → processing → completed
   ↓         ↓          ↓
 排队等待   正在处理    处理完成
   ↓         ↓          ↓
 可以重试   不可重试    可以搜索
```

## 优先级说明

| 优先级 | 处理方式 | 典型内容 |
|--------|----------|----------|
| 1-2 | 立即处理 | 重要课程、用户资料 |
| 3-4 | 快速处理 | 热门帖子、评论 |
| 5+ | 定时处理 | 普通评论、旧内容 |

## 故障排查

### 问题: QStash显示DELIVERED但没有embedding

**原因**: 
- 低优先级任务只加入队列，不立即处理
- 需要等待定时处理器运行

**解决方案**:
```bash
# 手动触发队列处理
curl -X POST https://studify-platform.vercel.app/api/embeddings/queue-monitor

# 查看队列状态
curl -X GET https://studify-platform.vercel.app/api/embeddings/queue-monitor
```

### 问题: Embedding服务器超时

**原因**: 
- 冷启动需要时间
- 网络延迟

**解决方案**:
- 系统会自动重试
- 超时时间已增加到60秒

## 监控和维护

### 查看队列状态
```bash
GET /api/embeddings/queue-monitor
```

### 手动处理队列
```bash
POST /api/embeddings/queue-monitor
```

### QStash控制台
- 查看定时任务状态
- 监控webhook调用
- 查看错误日志

## 性能优化

1. **批量处理**: 每次最多处理100个任务
2. **优先级队列**: 重要内容优先处理
3. **缓存机制**: 相同内容不重复生成
4. **错误重试**: 失败任务自动重试

## 总结

整个系统的核心是：
1. **自动化**: 内容创建时自动排队
2. **可靠性**: QStash保证任务执行
3. **可扩展**: 支持不同优先级和内容类型
4. **监控性**: 完整的状态跟踪和日志

你的评论任务（优先级5）会在QStash定时器运行时被处理，最长等待1小时。如果需要立即处理，可以手动调用queue-monitor端点。
