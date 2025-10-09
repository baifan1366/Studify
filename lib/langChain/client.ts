// lib/langChain/client.ts - Optimized OpenRouter + Grok-4 Configuration with Multi-Key Support
import { ChatOpenAI } from "@langchain/openai";
import { apiKeyManager } from "./api-key-manager";

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
}

// 默认配置
const DEFAULT_GROK_CONFIG: GrokConfig = {
  model: "deepseek/deepseek-chat-v3.1:free",
  temperature: 0.3,
  maxTokens: 15000, // DeepSeek支持最大64K tokens，但实际使用建议4K-8K
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  enableReasoning: false, // 默认关闭推理模式以节省成本
  streaming: true, // 启用流式响应提升用户体验
  timeout: 60000, // 60秒超时
  keySelectionStrategy: 'round_robin', // 默认轮询策略
  maxRetries: 3, // 默认重试3次
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
    model: "openai/gpt-4o", // Use GPT-4o for reasoning tasks
  });
}

/**
 * 获取创意写作专用的DeepSeek实例
 */
export function getCreativeLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    model: "openai/gpt-4o-mini", // Use GPT-4o-mini for creative tasks
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
    model: "openai/gpt-4o", // Use GPT-4o for analytical tasks
    temperature: 0.1, // 低温度确保一致性
    topP: 0.95,
    enableReasoning: true, // 启用推理提升分析质量
  });
}

/**
 * 获取大上下文窗口的DeepSeek实例（用于长文档处理）
 */
export function getLongContextLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    model: "openai/gpt-4o", // Use GPT-4o for long context tasks
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
    model: "openai/gpt-4o", // Use GPT-4o for vision tasks (supports images and function calling)
    temperature: 0.3,
    maxTokens: 4096,
  });
}

// 导出配置常量供其他模块使用
export { DEFAULT_GROK_CONFIG };
