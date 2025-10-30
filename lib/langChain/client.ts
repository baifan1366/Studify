// lib/langChain/client.ts - Optimized OpenRouter + Grok-4 Configuration with Multi-Key Support + Caching
import { ChatOpenAI } from "@langchain/openai";
import { apiKeyManager } from "./api-key-manager";

// Simple in-memory cache for LLM responses
class SimpleCache {
  private cache: Map<string, { response: any; timestamp: number }> = new Map();
  private ttl: number = 3600000; // 1 hour TTL

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`💾 Cache HIT: ${key.substring(0, 50)}...`);
    return item.response;
  }

  set(key: string, response: any): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
    console.log(`💾 Cache SET: ${key.substring(0, 50)}...`);
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
let globalCache: SimpleCache | null = null;

function getCache(): SimpleCache {
  if (!globalCache) {
    globalCache = new SimpleCache();
    console.log('💾 LLM Cache initialized');
  }
  return globalCache;
}

/**
 * Clear the global cache
 */
export function clearLLMCache() {
  getCache().clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const cache = getCache();
  return {
    size: cache.size(),
    enabled: true
  };
}

// Grok-4 模型配置选项
export interface GrokConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  enableReasoning?: boolean;
  streaming?: boolean;
  timeout?: number;
  keySelectionStrategy?: 'round_robin' | 'least_used' | 'best_performance';
  maxRetries?: number;
  enableCache?: boolean; // 是否启用缓存
}

// 默认配置
const DEFAULT_GROK_CONFIG: GrokConfig = {
  model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
  temperature: 0.3,
  maxTokens: 8000, // Reduced to fit within 16K context limit (leaving room for input tokens)
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  enableReasoning: false, // 默认关闭推理模式以节省成本
  streaming: true, // 启用流式响应提升用户体验
  timeout: 60000, // 60秒超时
  keySelectionStrategy: 'round_robin', // 默认轮询策略
  maxRetries: 3, // 默认重试3次
  enableCache: true, // 默认启用缓存
};

// 获取站点信息用于OpenRouter排名
const getSiteInfo = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const defaultUrl = isDevelopment 
    ? "http://localhost:3000" 
    : "https://studify-platform.vercel.app";
    
  // 在开发环境中，优先使用 localhost
  const siteUrl = isDevelopment 
    ? "http://localhost:3000"
    : (process.env.NEXT_PUBLIC_SITE_URL || defaultUrl);
    
  return {
    siteUrl,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Studify",
  };
};

/**
 * 创建优化的Grok-4 LLM实例 - 支持多key轮换
 * @param config 自定义配置选项
 * @returns ChatOpenAI实例
 */
export async function getLLM(config: Partial<GrokConfig> = {}) {
  // Set dummy OPENAI_API_KEY to prevent LangChain internal checks
  // This is safe because we override the baseURL to OpenRouter


  const finalConfig = { ...DEFAULT_GROK_CONFIG, ...config };
  const { siteUrl, siteName } = getSiteInfo();

  // 从key manager获取可用的API key
  const { key: apiKey, name: keyName } = await apiKeyManager.getAvailableKey(
    finalConfig.keySelectionStrategy
  );

  console.log(`🔑 Using OpenRouter key: ${keyName} (${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)})`);

  // 构造模型参数
  const modelParams: any = {
    model: finalConfig.model,
    temperature: finalConfig.temperature,
    maxTokens: finalConfig.maxTokens,
    topP: finalConfig.topP,
    frequencyPenalty: finalConfig.frequencyPenalty,
    presencePenalty: finalConfig.presencePenalty,
    streaming: finalConfig.streaming,
    timeout: finalConfig.timeout,
    maxRetries: finalConfig.maxRetries,
  };

  // Grok-4推理模式配置
  if (finalConfig.enableReasoning) {
    modelParams.reasoning = { enabled: true };
  }

  const chatOpenAI = new ChatOpenAI({
    ...modelParams,
    openAIApiKey: apiKey, // LangChain still needs this parameter
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "Authorization": `Bearer ${apiKey}`, // OpenRouter 需要这个头
        "HTTP-Referer": siteUrl, // 用于OpenRouter排名统计
        "X-Title": siteName, // 用于OpenRouter排名显示
      },
    },
    callbacks: [{
      handleLLMEnd: async () => {
        await apiKeyManager.recordUsage(keyName, true);
      },
      handleLLMError: async (error) => {
        await apiKeyManager.recordUsage(keyName, false, error);
      }
    }]
  });

  // 添加key信息到实例
  (chatOpenAI as any).__keyName = keyName;
  return chatOpenAI;
}

/**
 * 获取推理模式的DeepSeek实例（更强的推理能力，但成本更高）
 */
export function getReasoningLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    enableReasoning: true,
    temperature: 0.1, // 推理模式使用更低的温度
    model: process.env.OPEN_ROUTER_REASONING_MODEL || process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
  });
}

/**
 * 获取创意写作专用的DeepSeek实例
 */
export function getCreativeLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    model: process.env.OPEN_ROUTER_CREATIVE_MODEL || process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
    temperature: 0.8, // 高温度增加创意性
    topP: 0.9,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
  });
}

/**
 * 获取分析专用的DeepSeek实例
 */
export function getAnalyticalLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    model: process.env.OPEN_ROUTER_ANALYTICAL_MODEL || process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
    temperature: 0.1, // 低温度确保一致性
    topP: 0.95,
    enableReasoning: false, // DeepSeek doesn't support reasoning mode
  });
}

/**
 * 获取大上下文窗口的DeepSeek实例（用于长文档处理）
 */
export function getLongContextLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    model: process.env.OPEN_ROUTER_LONG_CONTEXT_MODEL || process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
    maxTokens: 32768, // 使用更大的上下文窗口
    temperature: 0.2,
  });
}

/**
 * 获取视觉模型实例（用于图文理解）- 使用Kimi VL模型
 */
export function getVisionLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    model: process.env.OPEN_ROUTER_IMAGE_MODEL || "moonshotai/kimi-vl-a3b-thinking:free", // Use image model for vision tasks
    temperature: 0.3,
    maxTokens: 4096,
  });
}

// 导出配置常量供其他模块使用
export { DEFAULT_GROK_CONFIG };
