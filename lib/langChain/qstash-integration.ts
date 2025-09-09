import { Client } from "@upstash/qstash";

// QStash integration for embedding queue (optional enhancement)
export class QStashEmbeddingQueue {
  private client: Client;
  private baseUrl: string;

  constructor() {
    if (!process.env.QSTASH_TOKEN) {
      throw new Error("QSTASH_TOKEN environment variable is required");
    }

    this.client = new Client({
      token: process.env.QSTASH_TOKEN,
    });

    this.baseUrl = process.env.SITE_URL || "http://localhost:3000";
  }

  // Queue single embedding job via QStash
  async queueEmbedding(
    contentType: string,
    contentId: number,
    priority: number = 5,
    delay?: number
  ) {
    try {
      const payload = {
        contentType,
        contentId,
        priority,
        timestamp: Date.now(),
      };

      const response = await this.client.publishJSON({
        url: `${this.baseUrl}/api/embeddings/process-webhook`,
        body: payload,
        delay: delay ? delay : undefined,
        retries: 3,
        headers: {
          "Content-Type": "application/json",
          "X-Priority": priority.toString(),
        },
      });

      return {
        success: true,
        messageId: (response as any).messageId || "unknown",
      };
    } catch (error) {
      console.error("QStash queue error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Queue batch of embeddings
  async queueBatch(
    items: Array<{
      contentType: string;
      contentId: number;
      priority?: number;
      delay?: number;
    }>
  ) {
    const results = await Promise.allSettled(
      items.map((item) =>
        this.queueEmbedding(
          item.contentType,
          item.contentId,
          item.priority,
          item.delay
        )
      )
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - successful;

    return { successful, failed, results };
  }

  // Schedule recurring embedding maintenance
  async scheduleMaintenanceTasks() {
    try {
      // Schedule daily cleanup
      await this.client.publishJSON({
        url: `${this.baseUrl}/api/embeddings/maintenance`,
        body: { task: "cleanup", type: "daily" },
        cron: "0 2 * * *", // 2 AM daily
        retries: 1,
      });

      // Schedule weekly requeue of failed items
      await this.client.publishJSON({
        url: `${this.baseUrl}/api/embeddings/maintenance`,
        body: { task: "requeue_failed", type: "weekly" },
        cron: "0 3 * * 0", // 3 AM every Sunday
        retries: 1,
      });

      return { success: true };
    } catch (error) {
      console.error("QStash schedule error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async queueReaction(
    action: "added" | "removed",
    userId: number,
    targetType: "post" | "comment",
    targetId: number,
    emoji: string,
    delay?: number
  ) {
    try {
      const payload = {
        action,
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        emoji,
        timestamp: Date.now(),
      };

      const response = await this.client.publishJSON({
        url: `${this.baseUrl}/api/reactions/process-webhook`,
        body: payload,
        delay: delay ? delay : undefined,
        retries: 3,
        headers: {
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        messageId: (response as any).messageId || "unknown",
      };
    } catch (error) {
      console.error("QStash reaction queue error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Singleton instance
let qstashQueue: QStashEmbeddingQueue | null = null;

export function getQStashQueue(): QStashEmbeddingQueue {
  if (!qstashQueue) {
    qstashQueue = new QStashEmbeddingQueue();
  }
  return qstashQueue;
}

// Enhanced queue strategy: Use QStash for specific scenarios
export async function smartQueue(
  contentType: string,
  contentId: number,
  options: {
    priority?: number;
    useQStash?: boolean;
    delay?: number;
    fallbackToDb?: boolean;
  } = {}
) {
  const {
    priority = 5,
    useQStash = false,
    delay,
    fallbackToDb = true,
  } = options;

  // Determine if we should use QStash
  const shouldUseQStash =
    useQStash ||
    priority <= 2 || // High priority items
    delay !== undefined || // Delayed processing
    process.env.EMBEDDING_QUEUE_STRATEGY === "qstash";

  if (shouldUseQStash && process.env.QSTASH_TOKEN) {
    try {
      const qstash = getQStashQueue();
      const result = await qstash.queueEmbedding(
        contentType,
        contentId,
        priority,
        delay
      );

      if (result.success) {
        return { method: "qstash", success: true, messageId: result.messageId };
      }

      // Fall back to database queue if QStash fails and fallback is enabled
      if (fallbackToDb) {
        const { queueContentForEmbedding } = await import("./vectorstore");
        const dbResult = await queueContentForEmbedding(
          contentType as any,
          contentId,
          priority
        );
        return { method: "database_fallback", success: dbResult };
      }

      return { method: "qstash", success: false, error: result.error };
    } catch (error) {
      console.error("QStash error, falling back to database:", error);

      if (fallbackToDb) {
        const { queueContentForEmbedding } = await import("./vectorstore");
        const dbResult = await queueContentForEmbedding(
          contentType as any,
          contentId,
          priority
        );
        return { method: "database_fallback", success: dbResult };
      }

      return {
        method: "qstash",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Use database queue
  const { queueContentForEmbedding } = await import("./vectorstore");
  const dbResult = await queueContentForEmbedding(
    contentType as any,
    contentId,
    priority
  );
  return { method: "database", success: dbResult };
}
