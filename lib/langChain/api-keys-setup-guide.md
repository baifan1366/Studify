# 🔑 API Keys 配置指南 - 支持20个OpenRouter Keys

## 📋 配置方法概览

你的API Key Manager支持3种灵活的配置方法，可以满足不同的部署需求：

### 方法1: 环境变量分别配置 (推荐用于开发)
### 方法2: 逗号分隔字符串 (推荐用于生产)  
### 方法3: JSON配置 (推荐用于复杂场景)

---

## 🚀 方法1: 分别配置环境变量

**适用场景**: 开发环境、需要精确控制每个key的场景

### 环境变量配置

```bash
# OpenRouter API Keys (支持1-20个)
OPENROUTER_API_KEY_1=sk-or-v1-your-first-key-here
OPENROUTER_API_KEY_2=sk-or-v1-your-second-key-here
OPENROUTER_API_KEY_3=sk-or-v1-your-third-key-here
OPENROUTER_API_KEY_4=sk-or-v1-your-fourth-key-here
OPENROUTER_API_KEY_5=sk-or-v1-your-fifth-key-here
# ... 继续到
OPENROUTER_API_KEY_20=sk-or-v1-your-twentieth-key-here

# 站点信息 (用于OpenRouter排名)
NEXT_PUBLIC_SITE_URL=https://studify-platform.vercel.app
NEXT_PUBLIC_SITE_NAME=Studify
```

### Key命名规则

系统会自动根据编号设置不同的Rate Limit：

| Key编号 | 命名 | Rate Limit | 用途 |
|--------|------|------------|------|
| 1-5 | `key_01` - `key_05` | 300 RPM | 高频使用 |
| 6-15 | `key_06` - `key_15` | 200 RPM | 中频使用 |
| 16-20 | `key_16` - `key_20` | 100 RPM | 备用Keys |

---

## 🎯 方法2: 逗号分隔配置 (生产推荐)

**适用场景**: 生产环境、CI/CD部署、容器化部署

```bash
# 所有keys用逗号分隔
OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3,sk-or-v1-key4,sk-or-v1-key5,sk-or-v1-key6,sk-or-v1-key7,sk-or-v1-key8,sk-or-v1-key9,sk-or-v1-key10,sk-or-v1-key11,sk-or-v1-key12,sk-or-v1-key13,sk-or-v1-key14,sk-or-v1-key15,sk-or-v1-key16,sk-or-v1-key17,sk-or-v1-key18,sk-or-v1-key19,sk-or-v1-key20

# 站点信息
NEXT_PUBLIC_SITE_URL=https://studify-platform.vercel.app
NEXT_PUBLIC_SITE_NAME=Studify
```

### 优势
- ✅ 单一环境变量，易于管理
- ✅ 适合容器化部署
- ✅ 减少环境变量数量
- ✅ 自动按顺序命名 (`batch_key_01`, `batch_key_02`, etc.)

---

## ⚙️ 方法3: JSON配置 (高级)

**适用场景**: 需要精确控制每个key的rate limit和名称

```bash
# JSON格式配置 (需要转义引号)
OPENROUTER_API_KEYS_CONFIG='[
  {
    "key": "sk-or-v1-high-priority-key-1",
    "name": "priority_key_01",
    "rateLimit": 400,
    "isActive": true
  },
  {
    "key": "sk-or-v1-high-priority-key-2", 
    "name": "priority_key_02",
    "rateLimit": 400,
    "isActive": true
  },
  {
    "key": "sk-or-v1-medium-key-1",
    "name": "medium_key_01", 
    "rateLimit": 200,
    "isActive": true
  },
  {
    "key": "sk-or-v1-backup-key-1",
    "name": "backup_key_01",
    "rateLimit": 100,
    "isActive": true
  }
]'

# 站点信息
NEXT_PUBLIC_SITE_URL=https://studify-platform.vercel.app
NEXT_PUBLIC_SITE_NAME=Studify
```

### JSON配置字段说明

| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `key` | string | ✅ | OpenRouter API Key |
| `name` | string | ❌ | 自定义key名称 (默认: `json_key_XX`) |
| `rateLimit` | number | ❌ | 自定义rate limit (默认: 200) |
| `isActive` | boolean | ❌ | 是否启用 (默认: true) |

---

## 🔧 部署平台配置示例

### Vercel 配置

```bash
# 在 Vercel Dashboard > Settings > Environment Variables 添加
OPENROUTER_API_KEYS=key1,key2,key3,key4,key5,key6,key7,key8,key9,key10,key11,key12,key13,key14,key15,key16,key17,key18,key19,key20
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SITE_NAME=Studify
```

### Netlify 配置

```bash
# 在 netlify.toml 或 Site Settings > Environment Variables
[build.environment]
  OPENROUTER_API_KEYS = "key1,key2,key3,key4,key5,key6,key7,key8,key9,key10,key11,key12,key13,key14,key15,key16,key17,key18,key19,key20"
  NEXT_PUBLIC_SITE_URL = "https://your-domain.netlify.app"
  NEXT_PUBLIC_SITE_NAME = "Studify"
```

### Docker 配置

```dockerfile
# Dockerfile
ENV OPENROUTER_API_KEYS=key1,key2,key3,key4,key5,key6,key7,key8,key9,key10,key11,key12,key13,key14,key15,key16,key17,key18,key19,key20
ENV NEXT_PUBLIC_SITE_URL=https://studify-platform.vercel.app
ENV NEXT_PUBLIC_SITE_NAME=Studify
```

### Railway/Render 配置

```bash
# 在平台的环境变量设置中添加
OPENROUTER_API_KEYS=key1,key2,key3,key4,key5,key6,key7,key8,key9,key10,key11,key12,key13,key14,key15,key16,key17,key18,key19,key20
NEXT_PUBLIC_SITE_URL=https://your-app.railway.app
NEXT_PUBLIC_SITE_NAME=Studify
```

---

## 🔄 使用示例

### 基础使用 (自动key轮换)

```typescript
import { getLLM } from '@/lib/langChain/client';

// 自动选择可用的key
const llm = await getLLM({
  temperature: 0.7,
  maxTokens: 2000,
});

const response = await llm.invoke([
  new HumanMessage("解释机器学习的基本概念")
]);
```

### 指定Key选择策略

```typescript
// 轮询策略 (默认)
const roundRobinLLM = await getLLM({
  keySelectionStrategy: 'round_robin',
  temperature: 0.5,
});

// 选择使用最少的key
const leastUsedLLM = await getLLM({
  keySelectionStrategy: 'least_used',
  temperature: 0.5,
});

// 选择性能最好的key (错误率最低)
const bestPerformanceLLM = await getLLM({
  keySelectionStrategy: 'best_performance',
  temperature: 0.5,
});
```

### 不同场景的优化配置

```typescript
// 高频场景 - 使用best_performance策略
const highFrequencyLLM = await getLLM({
  keySelectionStrategy: 'best_performance',
  maxRetries: 5,
  timeout: 30000,
});

// 批量处理 - 使用least_used策略
const batchProcessingLLM = await getLLM({
  keySelectionStrategy: 'least_used',
  maxRetries: 3,
  timeout: 60000,
});

// 实时对话 - 使用round_robin策略
const realTimeLLM = await getLLM({
  keySelectionStrategy: 'round_robin',
  streaming: true,
  timeout: 15000,
});
```

---

## 📊 监控和管理

### 获取Key状态

```typescript
import { apiKeyManager } from '@/lib/langChain/api-key-manager';

// 获取所有keys的状态
const status = apiKeyManager.getStatus();
console.log('Keys Status:', status);

/*
输出示例:
{
  keys: [
    {
      name: "key_01",
      isActive: true,
      errorCount: 0,
      cooldownUntil: null,
      lastError: null
    },
    // ... 更多keys
  ],
  usage: [
    {
      keyName: "key_01", 
      requestCount: 150,
      lastUsed: "2025-09-21T10:30:00Z"
    },
    // ... 更多使用统计
  ]
}
*/
```

### 手动重置Key

```typescript
// 重置特定key的状态
apiKeyManager.resetKey('key_01');

// 批量重置所有error状态的keys
status.keys.forEach(key => {
  if (key.errorCount > 5) {
    apiKeyManager.resetKey(key.name);
  }
});
```

---

## ⚠️ 常见问题和故障排除

### 1. 没有可用的API Keys

**错误**: `❌ No available API keys`

**解决方案**:
- 检查环境变量是否正确配置
- 确认至少有一个有效的key
- 检查所有keys是否都在冷却期

### 2. Rate Limit错误

**现象**: Key频繁进入冷却期

**解决方案**:
- 增加更多API keys
- 使用 `least_used` 策略分散负载
- 调整应用的请求频率

### 3. Key选择策略优化

| 场景 | 推荐策略 | 原因 |
|------|---------|------|
| 高并发应用 | `best_performance` | 选择错误率最低的key |
| 批量处理 | `least_used` | 平均分配负载 |
| 一般应用 | `round_robin` | 简单且有效的轮询 |

### 4. 环境变量调试

```typescript
// 添加调试代码检查配置
console.log('Available env vars:');
for (let i = 1; i <= 20; i++) {
  const key = process.env[`OPENROUTER_API_KEY_${i}`];
  if (key) {
    console.log(`Key ${i}: ${key.substring(0, 12)}...`);
  }
}

console.log('Batch keys:', process.env.OPENROUTER_API_KEYS?.split(',').length);
console.log('JSON config:', process.env.OPENROUTER_API_KEYS_CONFIG ? 'Present' : 'Missing');
```

---

## 🎯 最佳实践建议

### 1. Production环境
- 使用方法2 (逗号分隔) 部署
- 准备15-20个keys确保高可用性
- 启用错误日志监控

### 2. Development环境
- 使用方法1 (分别配置) 方便测试
- 3-5个keys足够开发使用

### 3. 监控策略
- 定期检查key使用情况
- 设置报警当可用keys低于阈值
- 记录和分析错误模式

### 4. 安全考虑
- 定期轮换API keys
- 在CI/CD中使用加密的环境变量
- 不要在代码中硬编码keys

通过这个灵活的配置系统，你可以轻松管理20个OpenRouter API keys，实现高可用性和负载均衡！🚀
