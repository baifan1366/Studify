import { ChatOpenAI } from "@langchain/openai";
import { createClient } from '@supabase/supabase-js';

// API Key 配置接口
interface ApiKeyConfig {
  key: string;
  name: string;
  rateLimit: number; // requests per minute
  isActive: boolean;
  errorCount: number;
  lastError?: Date;
  cooldownUntil?: Date;
}

// API Key 使用统计
interface ApiKeyUsage {
  keyName: string;
  requestCount: number;
  errorCount: number;
  lastUsed: Date;
  windowStart: Date;
}

export class ApiKeyManager {
  private keys: ApiKeyConfig[] = [];
  private usage: Map<string, ApiKeyUsage> = new Map();
  private currentKeyIndex = 0;
  private readonly supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.initializeKeys();
  }

  /**
   * 初始化API Keys from environment - 支持20个keys
   */
  private initializeKeys() {
    const keyConfigs: ApiKeyConfig[] = [];
    
    // 方法1: 从环境变量加载多个keys
    for (let i = 1; i <= 20; i++) {
      const key = process.env[`OPEN_ROUTER_KEY_${i}`];
      if (key && key.trim()) {
        keyConfigs.push({
          key: key.trim(),
          name: `key_${i.toString().padStart(2, '0')}`,
          rateLimit: this.getKeyRateLimit(i), // 根据key编号设置不同的rate limit
          isActive: true,
          errorCount: 0
        });
      }
    }

    // 方法2: 从逗号分隔的字符串加载
    const keysString = process.env.OPEN_ROUTER_KEYS;
    if (keysString && keyConfigs.length === 0) {
      const keys = keysString.split(',').map(k => k.trim()).filter(k => k);
      keys.forEach((key, index) => {
        keyConfigs.push({
          key,
          name: `batch_key_${(index + 1).toString().padStart(2, '0')}`,
          rateLimit: 200, // 默认rate limit
          isActive: true,
          errorCount: 0
        });
      });
    }

    // fallback to single key
    if (keyConfigs.length === 0 && process.env.OPEN_ROUTER_KEY) {
      keyConfigs.push({
        key: process.env.OPEN_ROUTER_KEY,
        name: 'fallback_key',
        rateLimit: 200,
        isActive: true,
        errorCount: 0
      });
    }

    this.keys = keyConfigs;
    console.log(`🔑 Initialized ${this.keys.length} API keys:`, 
      this.keys.map(k => k.name).join(', '));
    
    // 打印key状态摘要
    this.printKeysSummary();
  }

  /**
   * 根据key编号设置不同的rate limit
   */
  private getKeyRateLimit(keyIndex: number): number {
    // Key 1-5: 高频使用 (300 RPM)
    if (keyIndex <= 5) return 300;
    // Key 6-15: 中频使用 (200 RPM)  
    if (keyIndex <= 15) return 200;
    // Key 16-20: 备用keys (100 RPM)
    return 100;
  }

  /**
   * 打印keys配置摘要
   */
  private printKeysSummary() {
    if (this.keys.length === 0) {
      console.error('❌ No API keys configured!');
      return;
    }

    console.log('📊 API Keys Summary:');
    console.log(`  Total: ${this.keys.length} keys`);
    console.log(`  High-rate (300 RPM): ${this.keys.filter(k => k.rateLimit === 300).length}`);
    console.log(`  Medium-rate (200 RPM): ${this.keys.filter(k => k.rateLimit === 200).length}`);
    console.log(`  Low-rate (100 RPM): ${this.keys.filter(k => k.rateLimit === 100).length}`);
  }

  /**
   * 获取可用的API Key - 智能选择算法
   */
  async getAvailableKey(priority: 'round_robin' | 'least_used' | 'best_performance' = 'round_robin'): Promise<{key: string, name: string}> {
    const now = new Date();
    const availableKeys = this.keys.filter(keyConfig => 
      this.isKeyAvailable(keyConfig, now) && 
      !this.isRateLimited(keyConfig, this.getKeyUsage(keyConfig.name), now)
    );

    if (availableKeys.length === 0) {
      // 尝试重置冷却时间已过的keys
      this.resetExpiredCooldowns(now);
      
      // 再次检查
      const retryKeys = this.keys.filter(keyConfig => 
        this.isKeyAvailable(keyConfig, now) && 
        !this.isRateLimited(keyConfig, this.getKeyUsage(keyConfig.name), now)
      );

      if (retryKeys.length === 0) {
        throw new Error(`❌ No available API keys (total: ${this.keys.length}, checked: ${this.keys.length})`);
      }
      
      const selectedKey = retryKeys[0];
      return { key: selectedKey.key, name: selectedKey.name };
    }

    let selectedKey: ApiKeyConfig;

    switch (priority) {
      case 'least_used':
        selectedKey = this.selectLeastUsedKey(availableKeys);
        break;
      case 'best_performance':  
        selectedKey = this.selectBestPerformanceKey(availableKeys);
        break;
      case 'round_robin':
      default:
        selectedKey = this.selectRoundRobinKey(availableKeys);
        break;
    }

    console.log(`🔑 Selected key: ${selectedKey.name} (strategy: ${priority})`);
    return { key: selectedKey.key, name: selectedKey.name };
  }

  /**
   * 轮询选择key
   */
  private selectRoundRobinKey(availableKeys: ApiKeyConfig[]): ApiKeyConfig {
    // 优先选择高rate limit的keys
    const sortedKeys = availableKeys.sort((a, b) => b.rateLimit - a.rateLimit);
    
    const keyIndex = this.currentKeyIndex % sortedKeys.length;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % sortedKeys.length;
    
    return sortedKeys[keyIndex];
  }

  /**
   * 选择最少使用的key
   */
  private selectLeastUsedKey(availableKeys: ApiKeyConfig[]): ApiKeyConfig {
    return availableKeys.reduce((leastUsed, current) => {
      const currentUsage = this.getKeyUsage(current.name);
      const leastUsedUsage = this.getKeyUsage(leastUsed.name);
      
      return currentUsage.requestCount < leastUsedUsage.requestCount ? current : leastUsed;
    });
  }

  /**
   * 选择性能最佳的key (错误率最低)
   */
  private selectBestPerformanceKey(availableKeys: ApiKeyConfig[]): ApiKeyConfig {
    return availableKeys.reduce((best, current) => {
      // 综合考虑错误率和rate limit
      const currentScore = this.calculateKeyScore(current);
      const bestScore = this.calculateKeyScore(best);
      
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * 计算key评分 (越高越好)
   */
  private calculateKeyScore(keyConfig: ApiKeyConfig): number {
    const usage = this.getKeyUsage(keyConfig.name);
    const errorRate = usage.requestCount > 0 ? keyConfig.errorCount / usage.requestCount : 0;
    
    // 评分公式: rate limit权重70% + 错误率权重30%
    const rateLimitScore = keyConfig.rateLimit / 300; // 归一化到0-1
    const errorScore = Math.max(0, 1 - errorRate * 10); // 错误率越低分数越高
    
    return rateLimitScore * 0.7 + errorScore * 0.3;
  }

  /**
   * 重置已过期的冷却时间
   */
  private resetExpiredCooldowns(now: Date) {
    let resetCount = 0;
    this.keys.forEach(keyConfig => {
      if (keyConfig.cooldownUntil && keyConfig.cooldownUntil <= now) {
        keyConfig.cooldownUntil = undefined;
        if (!keyConfig.isActive && keyConfig.errorCount < 15) {
          keyConfig.isActive = true;
          resetCount++;
        }
      }
    });
    
    if (resetCount > 0) {
      console.log(`🔄 Reset ${resetCount} keys from cooldown`);
    }
  }

  /**
   * 检查key是否可用
   */
  private isKeyAvailable(keyConfig: ApiKeyConfig, now: Date): boolean {
    if (!keyConfig.isActive) return false;
    
    // 检查冷却时间
    if (keyConfig.cooldownUntil && keyConfig.cooldownUntil > now) {
      return false;
    }

    // 检查错误率
    if (keyConfig.errorCount > 5) {
      return false;
    }

    return true;
  }

  /**
   * 检查是否触及rate limit
   */
  private isRateLimited(keyConfig: ApiKeyConfig, usage: ApiKeyUsage, now: Date): boolean {
    const windowDuration = 60 * 1000; // 1分钟窗口
    const timeSinceWindowStart = now.getTime() - usage.windowStart.getTime();

    if (timeSinceWindowStart < windowDuration) {
      return usage.requestCount >= keyConfig.rateLimit;
    }

    // 重置窗口
    usage.requestCount = 0;
    usage.windowStart = now;
    return false;
  }

  /**
   * 记录API调用
   */
  async recordUsage(keyName: string, success: boolean, error?: Error) {
    const usage = this.getKeyUsage(keyName);
    const keyConfig = this.keys.find(k => k.name === keyName);
    
    if (!keyConfig) return;

    usage.requestCount++;
    usage.lastUsed = new Date();

    if (!success && error) {
      keyConfig.errorCount++;
      keyConfig.lastError = new Date();
      
      // 如果是rate limit error，设置冷却时间
      if (this.isRateLimitError(error)) {
        keyConfig.cooldownUntil = new Date(Date.now() + 60 * 1000); // 1分钟冷却
        console.warn(`🥶 Key ${keyName} in cooldown due to rate limit`);
      }
      
      // 如果错误太多，暂时禁用
      if (keyConfig.errorCount > 10) {
        keyConfig.isActive = false;
        keyConfig.cooldownUntil = new Date(Date.now() + 15 * 60 * 1000); // 15分钟冷却
        console.error(`❌ Key ${keyName} disabled due to too many errors`);
      }

      // 记录错误到数据库
      await this.logApiError(keyName, error);
    } else if (success) {
      // 成功调用时减少错误计数
      keyConfig.errorCount = Math.max(0, keyConfig.errorCount - 1);
    }
  }

  /**
   * 获取key使用统计
   */
  private getKeyUsage(keyName: string): ApiKeyUsage {
    if (!this.usage.has(keyName)) {
      this.usage.set(keyName, {
        keyName,
        requestCount: 0,
        errorCount: 0,
        lastUsed: new Date(),
        windowStart: new Date()
      });
    }
    return this.usage.get(keyName)!;
  }

  /**
   * 检查是否为rate limit错误
   */
  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('429');
  }

  /**
   * 记录API错误到数据库
   */
  private async logApiError(keyName: string, error: Error) {
    try {
      await this.supabase.from('api_error_log').insert({
        key_name: keyName,
        error_message: error.message,
        error_type: this.isRateLimitError(error) ? 'rate_limit' : 'api_error',
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log API error:', logError);
    }
  }

  /**
   * 创建LLM实例with自动key轮换
   */
  async createLLM(model = process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free", maxRetries = 3): Promise<ChatOpenAI> {
    const { key: apiKey, name: keyName } = await this.getAvailableKey();
    
    return new ChatOpenAI({
      model,
      temperature: 0.3,
      maxRetries,
      openAIApiKey: apiKey, // LangChain still needs this parameter
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "Authorization": `Bearer ${apiKey}`, // OpenRouter 需要这个头
        },
      },
      callbacks: [{
        handleLLMEnd: async () => {
          await this.recordUsage(keyName, true);
        },
        handleLLMError: async (error) => {
          await this.recordUsage(keyName, false, error);
        }
      }]
    });
  }

  /**
   * 获取所有keys状态
   */
  getStatus() {
    return {
      keys: this.keys.map(k => ({
        name: k.name,
        isActive: k.isActive,
        errorCount: k.errorCount,
        cooldownUntil: k.cooldownUntil,
        lastError: k.lastError
      })),
      usage: Array.from(this.usage.entries()).map(([name, usage]) => ({
        keyName: name,
        requestCount: usage.requestCount,
        lastUsed: usage.lastUsed
      }))
    };
  }

  /**
   * 手动重置key状态
   */
  resetKey(keyName: string) {
    const keyConfig = this.keys.find(k => k.name === keyName);
    if (keyConfig) {
      keyConfig.isActive = true;
      keyConfig.errorCount = 0;
      keyConfig.cooldownUntil = undefined;
      keyConfig.lastError = undefined;
      console.log(`🔄 Reset key ${keyName}`);
    }
  }
}

// Singleton instance
export const apiKeyManager = new ApiKeyManager();
