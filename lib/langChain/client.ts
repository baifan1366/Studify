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
  model: "x-ai/grok-4-fast:free",
  temperature: 0.3,
  maxTokens: 4096, // Grok-4支持最大2M tokens，但实际使用建议4K-8K
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
const getSiteInfo = () => ({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://studify-platform.vercel.app",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Studify",
});

/**
 * 创建优化的Grok-4 LLM实例 - 支持多key轮换
 * @param config 自定义配置选项
 * @returns ChatOpenAI实例
 */
export async function getLLM(config: Partial<GrokConfig> = {}) {
  const finalConfig = { ...DEFAULT_GROK_CONFIG, ...config };
  const { siteUrl, siteName } = getSiteInfo();

  // 从key manager获取可用的API key
  const { key: apiKey, name: keyName } = await apiKeyManager.getAvailableKey(
    finalConfig.keySelectionStrategy
  );

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
    openAIApiKey: apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
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
 * 获取推理模式的Grok-4实例（更强的推理能力，但成本更高）
 */
export function getReasoningLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    enableReasoning: true,
    temperature: 0.1, // 推理模式使用更低的温度
    model: "x-ai/grok-4-fast:free", // 或使用付费版本获得更好性能
  });
}

/**
 * 获取创意写作专用的Grok-4实例
 */
export function getCreativeLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    temperature: 0.8, // 高温度增加创意性
    topP: 0.9,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
  });
}

/**
 * 获取分析专用的Grok-4实例
 */
export function getAnalyticalLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    temperature: 0.1, // 低温度确保一致性
    topP: 0.95,
    enableReasoning: true, // 启用推理提升分析质量
  });
}

/**
 * 获取大上下文窗口的Grok-4实例（用于长文档处理）
 */
export function getLongContextLLM(config: Partial<GrokConfig> = {}) {
  return getLLM({
    ...config,
    maxTokens: 32768, // 使用更大的上下文窗口
    temperature: 0.2,
  });
}

// 导出配置常量供其他模块使用
export { DEFAULT_GROK_CONFIG };
