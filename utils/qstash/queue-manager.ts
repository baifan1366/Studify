import { qstashClient } from "./qstash";

/**
 * Small wrapper around the official QStash queue API.
 *
 * Keeping queue operations in the SDK is important: it handles destination
 * encoding and keeps queue/publish options aligned with the installed client.
 */
export class QStashQueueManager {
  async ensureQueue(queueName: string, parallelism: number = 1) {
    await qstashClient.queue({ queueName }).upsert({ parallelism });
    return "success";
  }

  async enqueue(
    queueName: string,
    targetUrl: string,
    payload: unknown,
    options: {
      retries?: number;
      delay?: string | number;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      headers?: Record<string, string>;
      callback?: string;
      failureCallback?: string;
      deduplicationId?: string;
      timeout?: string | number;
    } = {}
  ) {
    if (!targetUrl.startsWith("https://")) {
      throw new Error(`QStash destination must use HTTPS: ${targetUrl}`);
    }

    return qstashClient.queue({ queueName }).enqueueJSON({
      url: targetUrl,
      body: payload,
      retries: options.retries ?? 3,
      delay: options.delay as any,
      method: options.method ?? "POST",
      headers: options.headers,
      callback: options.callback,
      failureCallback: options.failureCallback,
      deduplicationId: options.deduplicationId,
      timeout: options.timeout as any,
    });
  }

  async getQueue(queueName: string) {
    return qstashClient.queue({ queueName }).get();
  }

  async deleteQueue(queueName: string) {
    await qstashClient.queue({ queueName }).delete();
    return true;
  }

  async listQueues() {
    return qstashClient.queue().list();
  }
}

let queueManager: QStashQueueManager | null = null;

export function getQueueManager(): QStashQueueManager {
  if (!queueManager) {
    queueManager = new QStashQueueManager();
  }
  return queueManager;
}
