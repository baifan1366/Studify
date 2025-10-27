# Embedding Queue 最终设置指南

## ✅ 已完成的改进

### 1. 简化架构

- ❌ 删除了复杂的 QStash queue 依赖
- ✅ `queue-monitor` 现在直接处理所有任务
- ✅ 不需要创建额外的 schedules
- ✅ 使用正确的 Supabase server client (`utils/supabase/server.ts`)

### 2. 更新的文件

- ✅ `app/api/embeddings/queue-monitor/route.ts` - 主处理器
- ✅ `app/api/embeddings/status/route.ts` - 状态查询
- ✅ `app/api/embeddings/maintenance/route.ts` - 维护任务
- ✅ `app/api/embeddings/trigger/route.ts` - 手动触发
- ✅ `app/api/embeddings/process/route.ts` - 批处理（备用）
- ✅ `utils/qstash/queue-manager.ts` - 修复 queueName 字段

## 🚀 现在你需要做什么

### 步骤 1: 部署代码

```powershell
git add .
git commit -m "Fix embedding queue - use server client and simplify architecture"
git push
```

### 步骤 2: 等待部署完成

访问 https://vercel.com/dashboard 查看部署状态

### 步骤 3: 测试系统

```powershell
# 手动触发处理（推荐）
Invoke-RestMethod -Uri "https://studify-platform.vercel.app/api/embeddings/queue-monitor" -Method Post

# 查看状态
Invoke-RestMethod -Uri "https://studify-platform.vercel.app/api/embeddings/status"
```

### 步骤 4: 验证数据库

```sql
-- 查看队列状态
SELECT status, COUNT(*)
FROM embedding_queue
GROUP BY status;

-- 应该看到 items 逐渐减少
-- 从 66 items → 50 → 30 → 10 → 0
```

## 📊 系统工作原理

### 现有的 QStash Schedules

你已经有 2 个 schedules：

1. **每小时运行** (0 \* \* \* \*)
2. **每天运行** (0 0 \* \* \*)

这些 schedules 会自动调用 `queue-monitor`

### Queue Monitor 的工作流程

```
QStash Schedule (每小时)
    ↓
queue-monitor 被调用
    ↓
获取 50 个 queued items
    ↓
对每个 item:
  1. 标记为 "processing"
  2. 生成 E5 embedding (384维)
  3. 生成 BGE embedding (1024维)
  4. 存储到 embeddings 表
  5. 从队列中删除
    ↓
如果失败:
  - retry_count +1
  - 如果 < 3: 重新排队（5分钟后）
  - 如果 >= 3: 标记为 "failed"
    ↓
队列为空时:
  - 清理旧数据
  - 每周日 3 AM 重试 failed items
```

## 🔍 监控

### PowerShell 实时监控

```powershell
while ($true) {
    Clear-Host
    $status = Invoke-RestMethod -Uri "https://studify-platform.vercel.app/api/embeddings/status"

    Write-Host "=== Embedding Queue Status ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""

    Write-Host "Queue:" -ForegroundColor Yellow
    Write-Host "  Total: $($status.queue.total)"
    if ($status.queue.byStatus) {
        $status.queue.byStatus.PSObject.Properties | ForEach-Object {
            $color = switch ($_.Name) {
                "queued" { "Yellow" }
                "processing" { "Cyan" }
                "failed" { "Red" }
                default { "White" }
            }
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor $color
        }
    }

    Write-Host ""
    Write-Host "Embeddings:" -ForegroundColor Green
    Write-Host "  Total: $($status.embeddings.total)"
    Write-Host "  With E5: $($status.embeddings.withE5)"
    Write-Host "  With BGE: $($status.embeddings.withBGE)"
    Write-Host "  With Both: $($status.embeddings.withBoth)"

    if ($status.recentItems) {
        Write-Host ""
        Write-Host "Recent Items:" -ForegroundColor Magenta
        $status.recentItems | Select-Object -First 5 | ForEach-Object {
            Write-Host "  $($_.contentType):$($_.contentId) - $($_.status) (age: $($_.age)min)"
        }
    }

    Start-Sleep -Seconds 30
}
```

### 数据库查询

```sql
-- 实时队列状态
SELECT
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries,
  MAX(created_at) as latest
FROM embedding_queue
GROUP BY status;

-- 最近处理的 items
SELECT
  content_type,
  content_id,
  status,
  retry_count,
  error_message,
  created_at,
  updated_at
FROM embedding_queue
ORDER BY updated_at DESC
LIMIT 20;

-- Embeddings 统计
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN has_e5_embedding THEN 1 ELSE 0 END) as with_e5,
  SUM(CASE WHEN has_bge_embedding THEN 1 ELSE 0 END) as with_bge,
  SUM(CASE WHEN has_e5_embedding AND has_bge_embedding THEN 1 ELSE 0 END) as dual_embeddings,
  AVG(token_count) as avg_tokens
FROM embeddings
WHERE status = 'completed';

-- 失败分析
SELECT
  error_message,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM embedding_queue
WHERE status = 'failed'
GROUP BY error_message
ORDER BY count DESC;
```

## ⚠️ 故障排除

### 问题 1: Items 还是卡在 "queued"

**检查 1: Schedule 是否在运行？**

```powershell
$headers = @{ "Authorization" = "Bearer $env:QSTASH_TOKEN" }
$schedules = Invoke-RestMethod -Uri "https://qstash.upstash.io/v2/schedules" -Headers $headers
$schedules | Where-Object { $_.destination -like "*embedding*" }
```

**检查 2: Endpoint 是否可访问？**

```powershell
try {
    Invoke-RestMethod -Uri "https://studify-platform.vercel.app/api/embeddings/queue-monitor"
    Write-Host "✅ Endpoint accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Endpoint error: $_" -ForegroundColor Red
}
```

**检查 3: 查看 Vercel 日志**

1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. 点击 "Logs"
4. 搜索 "queue-monitor"

**解决方案: 手动触发**

```powershell
Invoke-RestMethod -Uri "https://studify-platform.vercel.app/api/embeddings/queue-monitor" -Method Post
```

### 问题 2: Items 失败并显示错误

**检查错误类型：**

```sql
SELECT
  error_message,
  COUNT(*) as count,
  content_type
FROM embedding_queue
WHERE status = 'failed'
GROUP BY error_message, content_type
ORDER BY count DESC;
```

**常见错误及解决方案：**

| 错误                            | 原因                 | 解决方案                    |
| ------------------------------- | -------------------- | --------------------------- |
| "Failed to generate embeddings" | Embedding 服务器宕机 | 检查服务器状态，等待恢复    |
| "Database error"                | Schema 问题          | 运行 ALTER TABLE 添加缺失列 |
| "Timeout"                       | 文本太长             | 检查 content_text 长度      |
| "Connection refused"            | 网络问题             | 检查 Vercel 网络配置        |

**检查 Embedding 服务器：**

```powershell
# E5 Small
$e5 = Invoke-RestMethod -Uri "https://edusocial-e5-small-embedding-server.hf.space/healthz"
Write-Host "E5 Status: $($e5.status)" -ForegroundColor $(if ($e5.status -eq "ok") { "Green" } else { "Red" })

# BGE-M3
$bge = Invoke-RestMethod -Uri "https://edusocial-bge-m3-embedding-server.hf.space/healthz"
Write-Host "BGE Status: $($bge.status)" -ForegroundColor $(if ($bge.status -eq "ok") { "Green" } else { "Red" })
```

### 问题 3: 处理速度太慢

**当前配置：**

- 每次处理 50 items
- 每小时运行一次
- 66 items 需要约 1-2 小时

**加速方案：**

**方案 1: 增加处理频率（推荐）**

```powershell
# 创建新的 schedule - 每 10 分钟运行一次
$headers = @{
    "Authorization" = "Bearer $env:QSTASH_TOKEN"
    "Content-Type" = "application/json"
}
$body = @{
    destination = "https://studify-platform.vercel.app/api/embeddings/queue-monitor"
    cron = "*/10 * * * *"  # 每 10 分钟
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://qstash.upstash.io/v2/schedules" -Method Post -Headers $headers -Body $body
```

**方案 2: 手动触发多次**

```powershell
# 连续触发 3 次，每次间隔 30 秒
for ($i = 1; $i -le 3; $i++) {
    Write-Host "Trigger $i/3..." -ForegroundColor Cyan
    Invoke-RestMethod -Uri "https://studify-platform.vercel.app/api/embeddings/queue-monitor" -Method Post
    if ($i -lt 3) { Start-Sleep -Seconds 30 }
}
```

**方案 3: 增加批处理大小**
编辑 `app/api/embeddings/queue-monitor/route.ts`:

```typescript
.limit(50);  // 改为 .limit(100);
```

### 问题 4: 重置所有卡住的 items

```sql
-- 重置所有 processing 和 failed items
UPDATE embedding_queue
SET
  status = 'queued',
  retry_count = 0,
  error_message = NULL,
  scheduled_at = NOW(),
  processing_started_at = NULL,
  updated_at = NOW()
WHERE status IN ('processing', 'failed');

-- 验证
SELECT status, COUNT(*)
FROM embedding_queue
GROUP BY status;
```

## ✅ 成功标准

系统正常工作时，你应该看到：

### 数据库层面

- ✅ `embedding_queue` 表中的 items 逐渐减少
- ✅ `embeddings` 表中的 entries 逐渐增加
- ✅ `retry_count` 在失败时增加（最多 3）
- ✅ `error_message` 记录失败原因
- ✅ 没有 items 卡在 "processing" 超过 10 分钟

### API 层面

- ✅ `/api/embeddings/status` 返回正确的统计
- ✅ `/api/embeddings/queue-monitor` 成功处理 items
- ✅ Vercel 日志显示成功的处理记录

### QStash 层面

- ✅ Schedules 正常运行
- ✅ Messages 成功送达
- ✅ 没有 messages 在 DLQ (Dead Letter Queue)

## 📈 预期时间线

假设你有 66 items：

| 配置                     | 预计完成时间 |
| ------------------------ | ------------ |
| 每小时运行 (50 items/次) | 1-2 小时     |
| 每 10 分钟运行           | 15-20 分钟   |
| 手动触发 3 次            | 5-10 分钟    |

## 🎯 下一步

1. ✅ 部署代码到 Vercel
2. ✅ 等待自动处理（每小时）或手动触发
3. ✅ 监控处理进度
4. ✅ 验证 embeddings 表有新数据
5. ✅ 检查双重 embeddings (E5 + BGE)

## 📚 相关文档

- 详细架构说明: `SIMPLE_FIX_CN.md`
- 快速设置: `QUICK_SETUP.md`
- 完整文档: `documentation/EMBEDDING_QUEUE_SETUP.md`
- 诊断工具: `scripts/diagnose-embedding-queue.ts`

## 🆘 需要帮助？

1. 运行诊断: `npx tsx scripts/diagnose-embedding-queue.ts`
2. 查看 Vercel 日志
3. 查看 QStash dashboard
4. 检查数据库状态

---

**就这么简单！部署后，你的 66 个 items 会自动被处理。🚀**
