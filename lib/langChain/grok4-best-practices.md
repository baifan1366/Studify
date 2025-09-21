# 🚀 Grok-4 + LangChain 最佳实践指南

## 📋 目录
- [配置选项详解](#配置选项详解)
- [使用场景指南](#使用场景指南)
- [性能优化](#性能优化)
- [成本控制](#成本控制)
- [错误处理](#错误处理)
- [环境变量配置](#环境变量配置)

## 🎛️ 配置选项详解

### 基础配置参数

| 参数 | 类型 | 默认值 | 说明 | 建议范围 |
|-----|------|-------|------|---------|
| `model` | string | `"x-ai/grok-4-fast:free"` | 模型名称 | - |
| `temperature` | number | `0.3` | 控制回答的随机性 | 0.0-1.0 |
| `maxTokens` | number | `4096` | 最大输出长度 | 100-32768 |
| `topP` | number | `1.0` | 核采样概率 | 0.1-1.0 |
| `frequencyPenalty` | number | `0` | 频率惩罚 | -2.0-2.0 |
| `presencePenalty` | number | `0` | 存在惩罚 | -2.0-2.0 |
| `enableReasoning` | boolean | `false` | 启用推理模式 | - |
| `streaming` | boolean | `true` | 流式响应 | - |
| `timeout` | number | `60000` | 超时时间(ms) | 10000-120000 |

### 🎯 Temperature 使用指南

```typescript
// 💡 创意任务 (高温度)
const creativeLLM = getLLM({ temperature: 0.8 });
// 适用于：故事创作、营销文案、头脑风暴

// 🎯 平衡任务 (中温度) 
const balancedLLM = getLLM({ temperature: 0.3 });
// 适用于：一般对话、教学解释、内容总结

// 🔒 精确任务 (低温度)
const preciseLLM = getLLM({ temperature: 0.1 });
// 适用于：数据分析、代码生成、事实性回答
```

## 🎯 使用场景指南

### 1. 🧠 推理密集型任务

```typescript
const reasoningLLM = getReasoningLLM({
  maxTokens: 3000,
  temperature: 0.1,
});

// 适用场景：
// - 复杂数学问题
// - 逻辑推理
// - 多步骤分析
// - 编程问题解决
```

### 2. ✨ 创意内容生成

```typescript
const creativeLLM = getCreativeLLM({
  temperature: 0.9,
  topP: 0.8,
  frequencyPenalty: 0.3,
  presencePenalty: 0.3,
});

// 适用场景：
// - 课程介绍文案
// - 学习激励内容
// - 互动游戏设计
// - 个性化学习建议
```

### 3. 📊 数据分析任务

```typescript
const analyticalLLM = getAnalyticalLLM({
  enableReasoning: true,
  temperature: 0.0,
  maxTokens: 2000,
});

// 适用场景：
// - 学习数据分析
// - 用户行为洞察
// - 课程效果评估
// - 个性化推荐
```

### 4. 📚 长文档处理

```typescript
const longContextLLM = getLongContextLLM({
  maxTokens: 32768,
  temperature: 0.2,
});

// 适用场景：
// - 课程内容总结
// - 文档问答
// - 知识抽取
// - 课程大纲生成
```

## ⚡ 性能优化

### 1. 流式响应优化

```typescript
// ✅ 推荐：启用流式响应提升用户体验
const llm = getLLM({
  streaming: true,
  timeout: 30000, // 较短超时时间
});

// 处理流式响应
async function handleStreaming(llm: ChatOpenAI, messages: any[]) {
  const stream = await llm.stream(messages);
  
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk.content;
    // 实时更新UI
    updateUI(buffer);
  }
  
  return buffer;
}
```

### 2. 批量处理优化

```typescript
// ✅ 批量处理多个请求
async function batchProcess(queries: string[]) {
  const llm = getLLM({
    maxTokens: 1000, // 较小token限制
    temperature: 0.3,
  });

  const promises = queries.map(query => 
    llm.invoke([
      new SystemMessage("简洁回答"),
      new HumanMessage(query)
    ])
  );

  return await Promise.all(promises);
}
```

### 3. 缓存策略

```typescript
// ✅ 实现智能缓存
const responseCache = new Map<string, any>();

async function getCachedResponse(query: string, llm: ChatOpenAI) {
  const cacheKey = hashQuery(query);
  
  if (responseCache.has(cacheKey)) {
    console.log('🎯 Cache hit');
    return responseCache.get(cacheKey);
  }

  const response = await llm.invoke([
    new HumanMessage(query)
  ]);

  responseCache.set(cacheKey, response);
  return response;
}
```

## 💰 成本控制

### 1. 智能配置选择

```typescript
function getOptimalConfig(taskType: string, contentLength: number) {
  if (taskType === 'simple' && contentLength < 100) {
    return {
      enableReasoning: false,
      maxTokens: 300,
      temperature: 0.3,
    };
  }
  
  if (taskType === 'complex' || contentLength > 1000) {
    return {
      enableReasoning: true,
      maxTokens: 2000,
      temperature: 0.1,
    };
  }

  return DEFAULT_GROK_CONFIG;
}
```

### 2. 请求去重

```typescript
const requestDeduplicator = new Map<string, Promise<any>>();

async function deduplicatedRequest(query: string, llm: ChatOpenAI) {
  const key = hashQuery(query);
  
  if (requestDeduplicator.has(key)) {
    console.log('🔄 Request deduplication');
    return requestDeduplicator.get(key);
  }

  const promise = llm.invoke([new HumanMessage(query)]);
  requestDeduplicator.set(key, promise);
  
  // 清理过期请求
  setTimeout(() => requestDeduplicator.delete(key), 60000);
  
  return promise;
}
```

### 3. 用量监控

```typescript
class UsageTracker {
  private requests = 0;
  private tokens = 0;
  private costs = 0;

  track(tokens: number, cost: number) {
    this.requests++;
    this.tokens += tokens;
    this.costs += cost;
    
    console.log(`📊 Usage: ${this.requests} requests, ${this.tokens} tokens, $${this.costs.toFixed(4)}`);
  }

  getDailyReport() {
    return {
      requests: this.requests,
      tokens: this.tokens,
      estimatedCost: this.costs,
      avgTokensPerRequest: this.tokens / this.requests,
    };
  }
}
```

## 🛡️ 错误处理

### 1. 重试机制

```typescript
async function resilientLLMCall(
  llm: ChatOpenAI, 
  messages: any[], 
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await llm.invoke(messages);
    } catch (error) {
      console.warn(`❌ Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`所有重试失败: ${error}`);
      }
      
      // 指数退避
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### 2. 降级策略

```typescript
async function fallbackLLMCall(primaryQuery: string, fallbackQuery?: string) {
  try {
    // 尝试使用推理模式
    const reasoningLLM = getReasoningLLM();
    return await reasoningLLM.invoke([new HumanMessage(primaryQuery)]);
  } catch (error) {
    console.warn('🔄 Falling back to basic model');
    
    try {
      // 降级到基础模型
      const basicLLM = getLLM({ enableReasoning: false });
      const query = fallbackQuery || primaryQuery;
      return await basicLLM.invoke([new HumanMessage(query)]);
    } catch (fallbackError) {
      // 最终降级到静态回答
      return {
        content: '抱歉，AI助手暂时不可用，请稍后再试。'
      };
    }
  }
}
```

### 3. 输入验证

```typescript
function validateInput(input: string): { valid: boolean; error?: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: '输入不能为空' };
  }
  
  if (input.length > 10000) {
    return { valid: false, error: '输入过长，请分段处理' };
  }
  
  // 检查敏感内容
  const sensitivePattern = /password|token|secret|key/i;
  if (sensitivePattern.test(input)) {
    return { valid: false, error: '输入包含敏感信息' };
  }
  
  return { valid: true };
}
```

## 🔧 环境变量配置

### 必需环境变量

```bash
# OpenRouter API密钥（必需）
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx

# 站点信息（用于OpenRouter排名）
NEXT_PUBLIC_SITE_URL=https://studify.app
NEXT_PUBLIC_SITE_NAME=Studify

# 可选配置
GROK_DEFAULT_MODEL=x-ai/grok-4-fast:free
GROK_MAX_TOKENS=4096
GROK_TEMPERATURE=0.3
```

### 开发环境配置

```typescript
// lib/langChain/config.ts
export const getEnvironmentConfig = () => ({
  apiKey: process.env.OPENROUTER_API_KEY!,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Studify Development',
  defaultModel: process.env.GROK_DEFAULT_MODEL || 'x-ai/grok-4-fast:free',
  maxTokens: parseInt(process.env.GROK_MAX_TOKENS || '4096'),
  temperature: parseFloat(process.env.GROK_TEMPERATURE || '0.3'),
});
```

## 📈 监控和日志

### 1. 性能监控

```typescript
class PerformanceMonitor {
  async trackLLMCall<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${operation} completed in ${duration}ms`);
      
      // 发送到分析服务
      this.sendMetrics({
        operation,
        duration,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ ${operation} failed after ${duration}ms:`, error);
      
      this.sendMetrics({
        operation,
        duration,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }

  private sendMetrics(metrics: any) {
    // 发送到你的分析服务（如Mixpanel、Google Analytics等）
    // analytics.track('llm_call', metrics);
  }
}
```

### 2. 结构化日志

```typescript
import { createLogger } from './logger';

const logger = createLogger('LangChain');

export async function loggedLLMCall(
  llm: ChatOpenAI,
  messages: any[],
  context?: any
) {
  const requestId = generateRequestId();
  
  logger.info('🚀 Starting LLM call', {
    requestId,
    messageCount: messages.length,
    context,
  });

  try {
    const response = await llm.invoke(messages);
    
    logger.info('✅ LLM call completed', {
      requestId,
      responseLength: response.content.length,
    });
    
    return response;
  } catch (error) {
    logger.error('❌ LLM call failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}
```

## 🎯 Studify特定用例

### 1. 个性化学习建议

```typescript
export async function generatePersonalizedRecommendation(
  userProfile: any,
  learningHistory: any,
  currentCourse: any
) {
  const analyticalLLM = getAnalyticalLLM({
    maxTokens: 2000,
    enableReasoning: true,
  });

  const prompt = `
基于以下信息为学生生成个性化学习建议：

用户资料：${JSON.stringify(userProfile)}
学习历史：${JSON.stringify(learningHistory)}
当前课程：${JSON.stringify(currentCourse)}

请提供：
1. 学习进度分析
2. 个性化建议
3. 学习路径优化
4. 潜在困难点预警
  `;

  return await analyticalLLM.invoke([
    new SystemMessage("你是Studify的AI学习顾问。"),
    new HumanMessage(prompt),
  ]);
}
```

### 2. 智能课程内容生成

```typescript
export async function generateCourseContent(
  topic: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  duration: number
) {
  const creativeLLM = getCreativeLLM({
    temperature: 0.7,
    maxTokens: 3000,
  });

  return await creativeLLM.invoke([
    new SystemMessage(`你是资深教育专家，专门设计${level}级别的课程内容。`),
    new HumanMessage(`
为"${topic}"主题设计${duration}分钟的课程内容，包括：
1. 学习目标
2. 课程大纲
3. 重点知识点
4. 实践练习
5. 评估方式
    `),
  ]);
}
```

这些配置和最佳实践将帮助你在Studify平台中充分发挥Grok-4的能力，同时保持良好的性能和成本控制。
