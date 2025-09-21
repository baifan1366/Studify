/**
 * QStash Queue Manager for Video Processing
 * 
 * Simplified video processing flow:
 * 1. upload → transcribe → embed
 * 
 * No longer requires intermediate compression or audio conversion steps.
 * Videos are processed directly for transcription.
 */
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
      // First try to get the queue to see if it exists
      try {
        const getResponse = await fetch(`${this.baseUrl}/v2/queues/${queueName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });
        
        if (getResponse.ok) {
          console.log(`Queue ${queueName} already exists`);
          // Queue exists - QStash doesn't support updating parallelism on existing queues
          // The queue will keep its original parallelism setting
          // To change parallelism, you need to delete and recreate the queue
          return 'exists';
        }
      } catch (e) {
        // Queue doesn't exist, continue to create
      }
      
      // Create new queue
      const response = await fetch(`${this.baseUrl}/v2/queues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: queueName,
          parallelism,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 412) {
          throw new Error('Queue limit reached - upgrade your QStash plan');
        } else {
          throw new Error(`Failed to create queue: ${response.status} - ${errorText}`);
        }
      }

      // 200 response means queue created successfully
      console.log(`Queue ${queueName} created with parallelism: ${parallelism}`);
      return 'success';
    } catch (error) {
      console.error('Queue creation error:', error);
      throw error;
    }
  }

  /**
   * Enqueue a message to a specific queue
   * According to QStash API: POST /v2/enqueue/{queueName}/{destination}
   * 
   * Used for video processing steps:
   * - transcribe: Direct video transcription with Whisper API
   * - embed: Generate AI embeddings from transcription text
   * 
   * Note: delay parameter is ignored for queue enqueue operations.
   * Queue timing is managed by QStash based on parallelism and internal scheduling.
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
      retries = 3, // QStash quota limit
      delay = '10s', 
      method = 'POST',
      headers = {},
      callback,
      failureCallback
    } = options;

    try {
      // Validate and log target URL for debugging
      console.log(`🔍 [QStash] Target URL validation:`, {
        original: targetUrl,
        length: targetUrl.length,
        starts_with_https: targetUrl.startsWith('https://'),
        starts_with_http: targetUrl.startsWith('http://'),
        contains_double_slash: targetUrl.includes('//api'),
        url_pattern: targetUrl.match(/^https?:\/\/[^\/]+\/.*/)
      });

      const requestHeaders: Record<string, string> = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Upstash-Method': method,
        'Upstash-Retries': retries.toString(),
        ...headers,
      };

      // Note: Upstash-Delay is not supported with /v2/enqueue endpoint for queues
      // Queue processing is managed by QStash internally based on parallelism settings
      // If delay is needed, consider using /v2/publish endpoint instead

      // Add callback if specified
      if (callback) {
        requestHeaders['Upstash-Callback'] = callback;
      }

      // Add failure callback if specified
      if (failureCallback) {
        requestHeaders['Upstash-Failure-Callback'] = failureCallback;
      }

      // For QStash v2/enqueue, the URL should not be encoded
      // QStash expects the URL as part of the path directly
      
      const response = await fetch(
        `${this.baseUrl}/v2/enqueue/${queueName}/${targetUrl}`,
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
