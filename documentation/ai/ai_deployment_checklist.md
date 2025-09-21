# AI Workflow 系统部署检查清单

## ✅ 部署前检查

### 🔧 环境配置
- [ ] 配置至少1个OpenRouter API Key (`OPENROUTER_API_KEY_1`)
- [ ] 建议配置3个API Key实现轮换 (`OPENROUTER_API_KEY_2`, `OPENROUTER_API_KEY_3`)
- [ ] 验证Supabase连接 (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] 验证QStash配置 (`QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`)
- [ ] 设置生产域名 (`NEXT_PUBLIC_SITE_URL`)

### 🗄️ 数据库设置
- [ ] 执行 `db/ai_workflow_tables.sql` 创建AI工作流表
- [ ] 如需新embedding类型，执行 `db/additional_embedding_triggers.sql`
- [ ] 验证所有embedding触发器正常工作
- [ ] 检查数据库权限和索引

### 🧪 功能测试
- [ ] 测试简单AI调用 (`/api/ai/simple`)
- [ ] 测试工作流执行 (`/api/ai/workflow`)
- [ ] 测试上下文检索 (`/api/ai/context`)
- [ ] 测试API Key轮换机制
- [ ] 验证embedding搜索正常工作

## 🚀 部署步骤

### 1. 代码部署
```bash
# 确保所有文件已提交
git add .
git commit -m "Add AI workflow system"
git push origin main

# 部署到生产环境
npm run build
npm run deploy  # 或通过CI/CD
```

### 2. 环境变量配置
在生产环境中设置以下变量：
```bash
OPENROUTER_API_KEY_1=sk-or-v1-your-primary-key
OPENROUTER_API_KEY_2=sk-or-v1-your-secondary-key
OPENROUTER_API_KEY_3=sk-or-v1-your-backup-key
```

### 3. 数据库迁移
```sql
-- 在生产数据库中执行
\i db/ai_workflow_tables.sql
\i db/additional_embedding_triggers.sql  -- 如需要
```

### 4. 健康检查
```typescript
// 测试系统状态
const response = await fetch('https://your-domain.com/api/ai/admin');
const status = await response.json();
console.log('System status:', status.systemStatus);
```

## 🔍 部署后验证

### API端点测试
- [ ] `GET /api/ai/admin` - 系统状态正常
- [ ] `GET /api/ai/workflow` - 返回可用工作流列表
- [ ] `POST /api/ai/simple` - 简单AI调用响应正常
- [ ] 工作流执行完整流程测试

### 性能验证
- [ ] API响应时间 < 30秒
- [ ] 数据库查询性能正常
- [ ] embedding搜索速度合理
- [ ] 内存使用在正常范围

### 错误处理验证
- [ ] 无效API Key自动切换
- [ ] 网络错误重试机制
- [ ] 数据库连接错误处理
- [ ] 用户友好的错误消息

## 🎛️ 监控设置

### 1. 系统监控
```typescript
// 定期检查系统健康状况
setInterval(async () => {
  const status = await fetch('/api/ai/admin');
  if (!status.ok) {
    console.error('AI system unhealthy');
    // 发送告警
  }
}, 5 * 60 * 1000); // 每5分钟检查
```

### 2. 使用统计
- [ ] 设置API使用量监控
- [ ] 配置成本预警
- [ ] 监控错误率
- [ ] 跟踪用户使用模式

### 3. 性能监控
- [ ] API响应时间监控
- [ ] 数据库查询性能
- [ ] embedding搜索延迟
- [ ] 工作流执行时间

## 🔧 维护任务

### 日常维护
- [ ] 检查API Key使用量
- [ ] 监控系统错误日志
- [ ] 验证embedding队列处理
- [ ] 检查数据库存储空间

### 定期维护 (每周)
- [ ] 清理旧的工作流执行记录
- [ ] 分析AI使用统计
- [ ] 优化API Key配置
- [ ] 检查系统性能趋势

### 月度维护
- [ ] 评估API使用成本
- [ ] 更新AI模型配置
- [ ] 优化embedding触发器
- [ ] 系统安全检查

## 🚨 故障排除

### 常见问题
1. **API Key限制**
   - 检查 `/api/ai/admin?action=api-keys`
   - 重置问题Key: `POST /api/ai/admin` with `reset-api-key`

2. **工作流执行失败**
   - 检查错误日志: `/api/ai/admin?action=errors`
   - 验证模型可用性
   - 检查上下文长度限制

3. **Embedding搜索问题**
   - 验证触发器正常工作
   - 检查embedding队列状态
   - 确认向量数据库索引

### 紧急处理
- [ ] 准备API Key轮换计划
- [ ] 备用embedding服务配置
- [ ] 数据库备份和恢复流程
- [ ] 系统降级处理方案

## 📊 成功指标

### 技术指标
- API响应成功率 > 95%
- 平均响应时间 < 10秒
- embedding搜索准确率 > 80%
- 系统可用性 > 99%

### 业务指标
- 用户AI功能使用率
- 学习内容推荐点击率
- 智能问答满意度
- 课程分析使用量

## 🎯 优化建议

### 短期优化 (1-2周)
- [ ] 优化常用查询缓存
- [ ] 调整API Key轮换策略
- [ ] 优化embedding相似度阈值
- [ ] 改进错误消息显示

### 中期优化 (1-2月)
- [ ] 添加更多预定义工作流
- [ ] 实现用户个性化设置
- [ ] 优化数据库查询性能
- [ ] 增加更多AI模型选择

### 长期优化 (3-6月)
- [ ] 实现AI模型微调
- [ ] 添加多语言支持
- [ ] 实现实时协作功能
- [ ] 构建AI分析dashboard

---

✅ **部署完成后，你的Studify应用将拥有强大的AI功能！**

这个系统为你提供了：
- 🧠 智能课程分析和推荐
- 📝 自动化题目生成
- 🔍 语义搜索和上下文理解
- 🤖 个性化AI学习助手
- 📊 完整的监控和管理功能

开始享受AI驱动的智能学习体验吧！🚀
