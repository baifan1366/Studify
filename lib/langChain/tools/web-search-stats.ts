import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = Redis.fromEnv();

// Constants
const DAILY_QUOTA = parseInt(process.env.WEB_SEARCH_DAILY_QUOTA || '100', 10);
const QUOTA_WARNING_THRESHOLD = 0.9; // 90%
const CONSECUTIVE_FAILURE_LIMIT = 3;
const DISABLE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Interfaces
export interface SearchLogEntry {
  timestamp: number;
  query: string;
  resultCount: number;
  responseTime: number;
  cached: boolean;
  success: boolean;
  error?: string;
}

export interface SearchStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  dailyQuota: number;
  quotaUsed: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  isDisabled: boolean;
  disabledUntil: number | null;
}

interface DailyStats {
  date: string;
  calls: number;
  successes: number;
  failures: number;
  cacheHits: number;
  totalResponseTime: number;
}

interface GlobalStats {
  consecutiveFailures: number;
  lastFailureTime: number | null;
  disabledUntil: number | null;
}

// Redis keys
const getDailyStatsKey = (date: string = new Date().toISOString().split('T')[0]) => 
  `web_search_stats:daily:${date}`;
const GLOBAL_STATS_KEY = 'web_search_stats:global';

/**
 * Web Search Statistics Tracker
 * Monitors usage, tracks quota, and manages auto-disable on failures
 */
export class WebSearchStatsTracker {
  /**
   * Log a search request
   */
  static async logSearch(entry: SearchLogEntry): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = getDailyStatsKey(today);

    try {
      // Get current daily stats
      const dailyStats = await redis.get<DailyStats>(dailyKey) || {
        date: today,
        calls: 0,
        successes: 0,
        failures: 0,
        cacheHits: 0,
        totalResponseTime: 0,
      };

      // Update daily stats
      dailyStats.calls += 1;
      if (entry.success) {
        dailyStats.successes += 1;
      } else {
        dailyStats.failures += 1;
      }
      if (entry.cached) {
        dailyStats.cacheHits += 1;
      }
      dailyStats.totalResponseTime += entry.responseTime;

      // Save daily stats with 7-day expiration
      await redis.set(dailyKey, dailyStats, { ex: 7 * 24 * 60 * 60 });

      // Update global stats for consecutive failures
      await this.updateGlobalStats(entry.success);

      // Log to console
      this.logToConsole(entry);

      // Check quota warning
      await this.checkQuotaWarning(dailyStats.calls);
    } catch (error) {
      console.error('❌ Failed to log web search stats:', error);
    }
  }

  /**
   * Update global stats for failure tracking
   */
  private static async updateGlobalStats(success: boolean): Promise<void> {
    try {
      const globalStats = await redis.get<GlobalStats>(GLOBAL_STATS_KEY) || {
        consecutiveFailures: 0,
        lastFailureTime: null,
        disabledUntil: null,
      };

      if (success) {
        // Reset consecutive failures on success
        globalStats.consecutiveFailures = 0;
        globalStats.lastFailureTime = null;
      } else {
        // Increment consecutive failures
        globalStats.consecutiveFailures += 1;
        globalStats.lastFailureTime = Date.now();

        // Auto-disable if threshold reached
        if (globalStats.consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
          globalStats.disabledUntil = Date.now() + DISABLE_DURATION_MS;
          console.warn(
            `⚠️ Web search auto-disabled after ${CONSECUTIVE_FAILURE_LIMIT} consecutive failures. ` +
            `Will re-enable in 10 minutes.`
          );
        }
      }

      await redis.set(GLOBAL_STATS_KEY, globalStats);
    } catch (error) {
      console.error('❌ Failed to update global stats:', error);
    }
  }

  /**
   * Check if tool should be disabled
   */
  static async shouldDisable(): Promise<boolean> {
    try {
      const globalStats = await redis.get<GlobalStats>(GLOBAL_STATS_KEY);
      
      if (!globalStats || !globalStats.disabledUntil) {
        return false;
      }

      const now = Date.now();
      
      // Check if disable period has expired
      if (now >= globalStats.disabledUntil) {
        // Re-enable by resetting stats
        await redis.set(GLOBAL_STATS_KEY, {
          consecutiveFailures: 0,
          lastFailureTime: null,
          disabledUntil: null,
        });
        console.log('✅ Web search re-enabled after cooldown period');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to check disable status:', error);
      return false;
    }
  }

  /**
   * Get current statistics
   */
  static async getStats(): Promise<SearchStats> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = getDailyStatsKey(today);

      const [dailyStats, globalStats] = await Promise.all([
        redis.get<DailyStats>(dailyKey),
        redis.get<GlobalStats>(GLOBAL_STATS_KEY),
      ]);

      const daily = dailyStats || {
        date: today,
        calls: 0,
        successes: 0,
        failures: 0,
        cacheHits: 0,
        totalResponseTime: 0,
      };

      const global = globalStats || {
        consecutiveFailures: 0,
        lastFailureTime: null,
        disabledUntil: null,
      };

      const totalCalls = daily.calls;
      const averageResponseTime = totalCalls > 0 
        ? Math.round(daily.totalResponseTime / totalCalls) 
        : 0;

      const isDisabled = global.disabledUntil ? Date.now() < global.disabledUntil : false;

      return {
        totalCalls,
        successfulCalls: daily.successes,
        failedCalls: daily.failures,
        cacheHits: daily.cacheHits,
        cacheMisses: totalCalls - daily.cacheHits,
        averageResponseTime,
        dailyQuota: DAILY_QUOTA,
        quotaUsed: totalCalls,
        consecutiveFailures: global.consecutiveFailures,
        lastFailureTime: global.lastFailureTime,
        isDisabled,
        disabledUntil: global.disabledUntil,
      };
    } catch (error) {
      console.error('❌ Failed to get web search stats:', error);
      // Return default stats on error
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageResponseTime: 0,
        dailyQuota: DAILY_QUOTA,
        quotaUsed: 0,
        consecutiveFailures: 0,
        lastFailureTime: null,
        isDisabled: false,
        disabledUntil: null,
      };
    }
  }

  /**
   * Check and warn if approaching quota limit
   */
  private static async checkQuotaWarning(quotaUsed: number): Promise<void> {
    const warningThreshold = Math.floor(DAILY_QUOTA * QUOTA_WARNING_THRESHOLD);
    
    if (quotaUsed === warningThreshold) {
      console.warn(
        `⚠️ Web search quota at ${Math.round(QUOTA_WARNING_THRESHOLD * 100)}%: ` +
        `${quotaUsed}/${DAILY_QUOTA} calls used today`
      );
    }

    if (quotaUsed >= DAILY_QUOTA) {
      console.error(
        `❌ Web search daily quota exceeded: ${quotaUsed}/${DAILY_QUOTA} calls used`
      );
    }
  }

  /**
   * Log search entry to console
   */
  private static logToConsole(entry: SearchLogEntry): void {
    if (entry.success) {
      console.log(
        `🔍 Web search: query="${entry.query.substring(0, 50)}${entry.query.length > 50 ? '...' : ''}", ` +
        `results=${entry.resultCount}, time=${entry.responseTime}ms, cached=${entry.cached}`
      );
    } else {
      console.error(
        `❌ Web search failed: query="${entry.query.substring(0, 50)}${entry.query.length > 50 ? '...' : ''}", ` +
        `error=${entry.error || 'unknown'}, time=${entry.responseTime}ms`
      );
    }
  }

  /**
   * Reset daily statistics (for testing or manual reset)
   */
  static async resetDailyStats(date?: string): Promise<void> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dailyKey = getDailyStatsKey(targetDate);
      await redis.del(dailyKey);
      console.log(`✅ Reset daily stats for ${targetDate}`);
    } catch (error) {
      console.error('❌ Failed to reset daily stats:', error);
    }
  }

  /**
   * Reset global statistics (for testing or manual reset)
   */
  static async resetGlobalStats(): Promise<void> {
    try {
      await redis.set(GLOBAL_STATS_KEY, {
        consecutiveFailures: 0,
        lastFailureTime: null,
        disabledUntil: null,
      });
      console.log('✅ Reset global stats');
    } catch (error) {
      console.error('❌ Failed to reset global stats:', error);
    }
  }

  /**
   * Print current statistics to console
   */
  static async printStats(): Promise<void> {
    const stats = await this.getStats();
    
    console.log('\n📊 Web Search Statistics:');
    console.log('─'.repeat(50));
    console.log(`Total Calls:          ${stats.totalCalls}`);
    console.log(`Successful:           ${stats.successfulCalls} (${stats.totalCalls > 0 ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) : 0}%)`);
    console.log(`Failed:               ${stats.failedCalls} (${stats.totalCalls > 0 ? Math.round((stats.failedCalls / stats.totalCalls) * 100) : 0}%)`);
    console.log(`Cache Hits:           ${stats.cacheHits} (${stats.totalCalls > 0 ? Math.round((stats.cacheHits / stats.totalCalls) * 100) : 0}%)`);
    console.log(`Cache Misses:         ${stats.cacheMisses}`);
    console.log(`Avg Response Time:    ${stats.averageResponseTime}ms`);
    console.log(`Daily Quota:          ${stats.quotaUsed}/${stats.dailyQuota} (${Math.round((stats.quotaUsed / stats.dailyQuota) * 100)}%)`);
    console.log(`Consecutive Failures: ${stats.consecutiveFailures}`);
    console.log(`Status:               ${stats.isDisabled ? '🔴 DISABLED' : '🟢 ACTIVE'}`);
    
    if (stats.isDisabled && stats.disabledUntil) {
      const remainingMs = stats.disabledUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      console.log(`Re-enables in:        ${remainingMin} minute(s)`);
    }
    
    console.log('─'.repeat(50) + '\n');
  }
}
