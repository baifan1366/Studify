import { getQStashQueue } from '@/lib/langChain/qstash-integration';
import { startEmbeddingProcessor } from '@/lib/langChain/embedding-processor';

// Startup configuration for embedding system
export class EmbeddingStartup {
  private static instance: EmbeddingStartup | null = null;
  private isInitialized = false;

  static getInstance(): EmbeddingStartup {
    if (!EmbeddingStartup.instance) {
      EmbeddingStartup.instance = new EmbeddingStartup();
    }
    return EmbeddingStartup.instance;
  }

  // Initialize embedding system on app startup
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Embedding system already initialized');
      return;
    }

    console.log('Initializing embedding system...');

    try {
      // Check if QStash is configured
      const useQStash = !!process.env.QSTASH_TOKEN;
      
      if (useQStash) {
        console.log('QStash detected, setting up QStash-based embedding processing');
        await this.initializeQStash();
      } else {
        console.log('QStash not configured, using database-based embedding processing');
        await this.initializeDatabaseProcessor();
      }

      // Schedule maintenance tasks
      await this.scheduleMaintenance();

      this.isInitialized = true;
      console.log('Embedding system initialized successfully');

    } catch (error) {
      console.error('Failed to initialize embedding system:', error);
      
      // Fallback to database processor
      try {
        console.log('Falling back to database processor...');
        await this.initializeDatabaseProcessor();
        this.isInitialized = true;
        console.log('Embedding system initialized with database fallback');
      } catch (fallbackError) {
        console.error('Failed to initialize embedding system with fallback:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Initialize QStash-based processing
  private async initializeQStash(): Promise<void> {
    try {
      const qstashQueue = getQStashQueue();
      
      // Schedule maintenance tasks
      await qstashQueue.scheduleMaintenanceTasks();
      
      // Also start database processor for immediate processing of high-priority items
      await startEmbeddingProcessor();
      
      console.log('QStash embedding system initialized');
    } catch (error) {
      console.error('QStash initialization failed:', error);
      throw error;
    }
  }

  // Initialize database-only processing
  private async initializeDatabaseProcessor(): Promise<void> {
    try {
      await startEmbeddingProcessor();
      console.log('Database embedding processor started');
    } catch (error) {
      console.error('Database processor initialization failed:', error);
      throw error;
    }
  }

  // Schedule maintenance tasks
  private async scheduleMaintenance(): Promise<void> {
    // Set up periodic cleanup (if not using QStash cron)
    if (!process.env.QSTASH_TOKEN) {
      // Clean up old search records every 24 hours
      setInterval(async () => {
        try {
          await this.cleanupOldSearchRecords();
        } catch (error) {
          console.error('Maintenance cleanup failed:', error);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
    }
  }

  // Cleanup old search records
  private async cleanupOldSearchRecords(): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Delete search records older than 30 days
      const { error } = await supabase
        .from('embedding_searches')
        .delete()
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Failed to cleanup old search records:', error);
      } else {
        console.log('Successfully cleaned up old search records');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Get system status
  getStatus(): {
    initialized: boolean;
    useQStash: boolean;
    hasToken: boolean;
  } {
    return {
      initialized: this.isInitialized,
      useQStash: !!process.env.QSTASH_TOKEN,
      hasToken: !!process.env.QSTASH_TOKEN
    };
  }

  // Force reinitialize
  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const embeddingStartup = EmbeddingStartup.getInstance();

// Auto-initialize on import (for Next.js app startup)
if (typeof window === 'undefined') { // Server-side only
  // Initialize after a short delay to ensure environment is ready
  setTimeout(() => {
    embeddingStartup.initialize().catch(error => {
      console.error('Auto-initialization failed:', error);
    });
  }, 1000);
}

// Utility functions
export async function initializeEmbeddingSystem(): Promise<void> {
  await embeddingStartup.initialize();
}

export function getEmbeddingSystemStatus() {
  return embeddingStartup.getStatus();
}

export async function reinitializeEmbeddingSystem(): Promise<void> {
  await embeddingStartup.reinitialize();
}
