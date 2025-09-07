import { getVectorStore } from './vectorstore';

// Background processor for embedding queue
export class EmbeddingProcessor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly processInterval: number;
  private readonly maxConcurrentBatches: number;
  private activeBatches = 0;

  constructor(
    batchSize: number = 10,
    processInterval: number = 5000, // 5 seconds
    maxConcurrentBatches: number = 3
  ) {
    this.batchSize = batchSize;
    this.processInterval = processInterval;
    this.maxConcurrentBatches = maxConcurrentBatches;
  }

  // Start the background processor
  start(): void {
    if (this.isRunning) {
      console.log('Embedding processor is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting embedding processor...');

    this.intervalId = setInterval(async () => {
      if (this.activeBatches >= this.maxConcurrentBatches) {
        return; // Skip if too many concurrent batches
      }

      try {
        await this.processBatch();
      } catch (error) {
        console.error('Error in embedding processor:', error);
      }
    }, this.processInterval);
  }

  // Stop the background processor
  stop(): void {
    if (!this.isRunning) {
      console.log('Embedding processor is not running');
      return;
    }

    this.isRunning = false;
    console.log('Stopping embedding processor...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Process a single batch
  private async processBatch(): Promise<void> {
    const vectorStore = getVectorStore();
    
    try {
      this.activeBatches++;
      
      // Get batch of items to process
      const batch = await vectorStore.getEmbeddingBatch(this.batchSize);
      
      if (batch.length === 0) {
        return; // No items to process
      }

      console.log(`Processing embedding batch of ${batch.length} items`);

      // Process batch
      const successCount = await vectorStore.processBatchEmbeddings(batch);
      
      console.log(`Completed embedding batch: ${successCount}/${batch.length} successful`);
      
    } catch (error) {
      console.error('Error processing embedding batch:', error);
    } finally {
      this.activeBatches--;
    }
  }

  // Get processor status
  getStatus(): {
    isRunning: boolean;
    activeBatches: number;
    maxConcurrentBatches: number;
    batchSize: number;
    processInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      activeBatches: this.activeBatches,
      maxConcurrentBatches: this.maxConcurrentBatches,
      batchSize: this.batchSize,
      processInterval: this.processInterval
    };
  }

  // Process single item immediately (for high priority items)
  async processImmediately(contentType: string, contentId: number): Promise<boolean> {
    const vectorStore = getVectorStore();
    
    try {
      // Get the specific item from queue
      const batch = await vectorStore.getEmbeddingBatch(100); // Get larger batch to find our item
      const targetItem = batch.find(item => 
        item.content_type === contentType && item.content_id === contentId
      );
      
      if (!targetItem) {
        console.log(`Item not found in queue: ${contentType}:${contentId}`);
        return false;
      }

      console.log(`Processing immediate embedding for ${contentType}:${contentId}`);
      
      // Process single item
      const success = await vectorStore.processEmbedding(targetItem);
      
      if (success) {
        console.log(`Successfully processed immediate embedding for ${contentType}:${contentId}`);
      } else {
        console.log(`Failed to process immediate embedding for ${contentType}:${contentId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Error processing immediate embedding for ${contentType}:${contentId}:`, error);
      return false;
    }
  }

  // Bulk queue existing content for embedding
  async queueExistingContent(options: {
    profiles?: boolean;
    courses?: boolean;
    posts?: boolean;
    comments?: boolean;
    lessons?: boolean;
    batchSize?: number;
  } = {}): Promise<{
    profiles: number;
    courses: number;
    posts: number;
    comments: number;
    lessons: number;
    total: number;
  }> {
    const vectorStore = getVectorStore();
    const results = {
      profiles: 0,
      courses: 0,
      posts: 0,
      comments: 0,
      lessons: 0,
      total: 0
    };

    try {
      if (options.profiles !== false) {
        console.log('Queuing existing profiles for embedding...');
        const profileCount = await this.queueContentType('profile', options.batchSize);
        results.profiles = profileCount;
        results.total += profileCount;
      }

      if (options.courses !== false) {
        console.log('Queuing existing courses for embedding...');
        const courseCount = await this.queueContentType('course', options.batchSize);
        results.courses = courseCount;
        results.total += courseCount;
      }

      if (options.posts !== false) {
        console.log('Queuing existing posts for embedding...');
        const postCount = await this.queueContentType('post', options.batchSize);
        results.posts = postCount;
        results.total += postCount;
      }

      if (options.comments !== false) {
        console.log('Queuing existing comments for embedding...');
        const commentCount = await this.queueContentType('comment', options.batchSize);
        results.comments = commentCount;
        results.total += commentCount;
      }

      if (options.lessons !== false) {
        console.log('Queuing existing lessons for embedding...');
        const lessonCount = await this.queueContentType('lesson', options.batchSize);
        results.lessons = lessonCount;
        results.total += lessonCount;
      }

      console.log(`Queued ${results.total} items for embedding`);
      return results;
    } catch (error) {
      console.error('Error queuing existing content:', error);
      return results;
    }
  }

  // Queue specific content type
  private async queueContentType(contentType: string, batchSize: number = 100): Promise<number> {
    const vectorStore = getVectorStore();
    let count = 0;
    let offset = 0;
    
    try {
      while (true) {
        // Get batch of content IDs from the appropriate table
        const ids = await this.getContentIds(contentType, batchSize, offset);
        
        if (ids.length === 0) {
          break; // No more content
        }

        // Queue each item
        const promises = ids.map(id => 
          vectorStore.queueForEmbedding(contentType as any, id, 5)
        );
        
        const results = await Promise.all(promises);
        const successCount = results.filter(result => result).length;
        
        count += successCount;
        offset += batchSize;
        
        console.log(`Queued ${successCount}/${ids.length} ${contentType} items (total: ${count})`);
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error queuing ${contentType} content:`, error);
    }
    
    return count;
  }

  // Get content IDs from database
  private async getContentIds(contentType: string, limit: number, offset: number): Promise<number[]> {
    const vectorStore = getVectorStore();
    
    try {
      let tableName: string;
      let whereClause = 'is_deleted = false';
      
      switch (contentType) {
        case 'profile':
          tableName = 'profiles';
          break;
        case 'course':
          tableName = 'course';
          break;
        case 'post':
          tableName = 'community_post';
          break;
        case 'comment':
          tableName = 'community_comment';
          break;
        case 'lesson':
          tableName = 'course_lesson';
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      const { data, error } = await (vectorStore as any).supabase
        .from(tableName)
        .select('id')
        .eq('is_deleted', false)
        .range(offset, offset + limit - 1)
        .order('id');

      if (error) {
        console.error(`Error getting ${contentType} IDs:`, error);
        return [];
      }

      return data.map((row: any) => row.id);
    } catch (error) {
      console.error(`Error getting ${contentType} IDs:`, error);
      return [];
    }
  }
}

// Singleton instance
let processorInstance: EmbeddingProcessor | null = null;

export function getEmbeddingProcessor(): EmbeddingProcessor {
  if (!processorInstance) {
    processorInstance = new EmbeddingProcessor();
  }
  return processorInstance;
}

// Utility functions
export async function startEmbeddingProcessor(): Promise<void> {
  const processor = getEmbeddingProcessor();
  processor.start();
}

export async function stopEmbeddingProcessor(): Promise<void> {
  const processor = getEmbeddingProcessor();
  processor.stop();
}

export async function getProcessorStatus() {
  const processor = getEmbeddingProcessor();
  return processor.getStatus();
}

export async function queueAllExistingContent() {
  const processor = getEmbeddingProcessor();
  return processor.queueExistingContent();
}
