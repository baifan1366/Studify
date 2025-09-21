# AI Workflow 环境变量配置

## 必需的环境变量

将以下变量添加到你的 `.env.local` 文件中：

```bash
# =========================
# AI WORKFLOW CONFIGURATION
# =========================

# OpenRouter API Keys (至少需要1个，建议配置3个用于轮换)
OPENROUTER_API_KEY_1="sk-or-v1-your-primary-key-here"
OPENROUTER_API_KEY_2="sk-or-v1-your-secondary-key-here"  
OPENROUTER_API_KEY_3="sk-or-v1-your-backup-key-here"

# 已有的Supabase配置 (保持不变)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 已有的QStash配置 (保持不变)
QSTASH_URL="https://qstash.upstash.io"
QSTASH_TOKEN="your-qstash-token"
QSTASH_CURRENT_SIGNING_KEY="your-signing-key"
QSTASH_NEXT_SIGNING_KEY="your-next-signing-key"

# 站点URL (已有，用于OAuth重定向)
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

## OpenRouter API Key 获取步骤

1. 访问 [OpenRouter.ai](https://openrouter.ai/)
2. 注册账号并登录
3. 前往 "Keys" 页面
4. 创建新的API Key
5. 复制Key并添加到环境变量中

## 推荐的AI模型配置

```bash
# 在代码中使用的推荐模型
# 复杂任务: anthropic/claude-3.5-sonnet
# 简单任务: openai/gpt-4o-mini
# 创作任务: openai/gpt-4o
# 多语言: google/gemini-pro
```

## API Key 使用建议

- **Primary Key**: 用于正常业务流量
- **Secondary Key**: 当主Key达到限制时自动切换
- **Backup Key**: 应急备用，可以使用较低配额的Key

## 安全注意事项

⚠️ **重要**: 
- 永远不要将API Key提交到版本控制中
- 定期轮换API Key
- 监控API使用量避免意外费用
- 在生产环境中使用不同的Key
