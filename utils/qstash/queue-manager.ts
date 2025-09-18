export class QStashQueueManager {
  private token: string;
  private baseUrl: string;

  constructor() {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error("QSTASH_TOKEN environment variable is required");
    }
    
    this.token = token;
    this.baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
  }

  /**
   * Create or update a queue with specified parallelism
   * According to QStash API: POST /v2/queues/
   */
  async ensureQueue(queueName: string, parallelism: number = 1) {
    try {
      const response = await fetch(`${this.baseUrl}/v2/queues/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueName,
          parallelism,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check if queue already exists (200 response means upsert successful)
        if (response.status === 200) {
          return 'updated';
        } else if (response.status === 412) {
          throw new Error('Queue limit reached - upgrade your QStash plan');
        } else {
          throw new Error(`Failed to create queue: ${response.status} - ${errorText}`);
        }
      }

      return 'created';
    } catch (error) {
      console.error('Queue creation error:', error);
      throw error;
    }
  }

  /**
   * Enqueue a message to a specific queue
   * According to QStash API: POST /v2/enqueue/{queueName}/{destination}
   */
  async enqueue(
    queueName: string, 
    targetUrl: string, 
    payload: any,
    options: {
      retries?: number;
      delay?: string;
      method?: string;
      headers?: Record<string, string>;
      callback?: string;
      failureCallback?: string;
    } = {}
  ) {
    const { 
      retries = 3, 
      delay = '10s', 
      method = 'POST',
      headers = {},
      callback,
      failureCallback
    } = options;

    try {
      const requestHeaders: Record<string, string> = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Upstash-Method': method,
        'Upstash-Retries': retries.toString(),
        ...headers,
      };

      // Add delay if specified
      if (delay) {
        requestHeaders['Upstash-Delay'] = delay;
      }

      // Add callback if specified
      if (callback) {
        requestHeaders['Upstash-Callback'] = callback;
      }

      // Add failure callback if specified
      if (failureCallback) {
        requestHeaders['Upstash-Failure-Callback'] = failureCallback;
      }

      const response = await fetch(
        `${this.baseUrl}/v2/enqueue/${queueName}/${encodeURIComponent(targetUrl)}`,
        {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QStash enqueue failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Enqueue error:', error);
      throw error;
    }
  }

  /**
   * Get queue information
   * According to QStash API: GET /v2/queues/{queueName}
   * Returns: { createdAt, updatedAt, name, parallelism, lag }
   */
  async getQueue(queueName: string) {
    try {
      const response = await fetch(`${this.baseUrl}/v2/queues/${queueName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get queue info: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get queue error:', error);
      throw error;
    }
  }

  /**
   * Delete a queue
   * According to QStash API: DELETE /v2/queues/{queueName}
   */
  async deleteQueue(queueName: string) {
    try {
      const response = await fetch(`${this.baseUrl}/v2/queues/${queueName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete queue: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Delete queue error:', error);
      throw error;
    }
  }

  /**
   * List all queues
   * According to QStash API: GET /v2/queues
   */
  async listQueues() {
    try {
      const response = await fetch(`${this.baseUrl}/v2/queues`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list queues: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('List queues error:', error);
      throw error;
    }
  }
}

// Singleton instance
let queueManager: QStashQueueManager | null = null;

export function getQueueManager(): QStashQueueManager {
  if (!queueManager) {
    queueManager = new QStashQueueManager();
  }
  return queueManager;
}
