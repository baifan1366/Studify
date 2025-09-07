import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, generateBatchEmbeddings, validateEmbedding, preprocessTextForEmbedding } from './embedding';
import { chunkDocumentSemantically, SemanticChunk, EnhancedChunkMetadata } from './semantic-chunking';

// Database types
interface EmbeddingRecord {
  id: number;
  public_id: string;
  content_type: string;
  content_id: number;
  content_hash: string;
  embedding: number[];
  content_text: string;
  embedding_model: string;
  language: string;
  token_count?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'outdated';
  error_message?: string;
  retry_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Enhanced metadata fields
  chunk_type?: 'summary' | 'section' | 'paragraph' | 'detail';
  hierarchy_level?: number;
  parent_chunk_id?: number;
  section_title?: string;
  semantic_density?: number;
  key_terms?: string[];
  sentence_count?: number;
  word_count?: number;
  has_code_block?: boolean;
  has_table?: boolean;
  has_list?: boolean;
  chunk_language?: string;
}

interface QueueRecord {
  id: number;
  public_id: string;
  content_type: string;
  content_id: number;
  content_text: string;
  content_hash: string;
  priority: number;
  scheduled_at: string;
  processing_started_at?: string;
  retry_count: number;
  max_retries: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  content_type: string;
  content_id: number;
  content_text: string;
  similarity: number;
  metadata: {
    created_at: string;
    updated_at: string;
    token_count?: number;
    embedding_model: string;
  };
}

// Content types enum
export const CONTENT_TYPES = {
  PROFILE: 'profile',
  POST: 'post',
  COMMENT: 'comment',
  COURSE: 'course',
  LESSON: 'lesson',
  AUTH_USER: 'auth_user'
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// Vector store class for managing embeddings
export class VectorStore {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Queue content for embedding
  async queueForEmbedding(
    contentType: ContentType,
    contentId: number,
    priority: number = 5
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('queue_for_embedding', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_priority: priority
      } as any);

      if (error) {
        console.error('Error queuing for embedding:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error queuing for embedding:', error);
      return false;
    }
  }

  // Get next batch of items to process
  async getEmbeddingBatch(batchSize: number = 10): Promise<QueueRecord[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_embedding_batch', {
        batch_size: batchSize
      } as any);

      if (error) {
        console.error('Error getting embedding batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting embedding batch:', error);
      return [];
    }
  }

  // Process a single embedding with semantic chunking
  async processEmbedding(queueRecord: QueueRecord): Promise<boolean> {
    try {
      // Use semantic chunking for better content processing
      const chunks = await chunkDocumentSemantically(
        queueRecord.content_text,
        queueRecord.content_type,
        queueRecord.content_id.toString()
      );

      if (chunks.length === 0) {
        await this.failEmbedding(queueRecord.id, 'No valid chunks generated');
        return false;
      }

      // Process each chunk
      let successCount = 0;
      for (const chunk of chunks) {
        try {
          // Generate embedding for this chunk
          const result = await generateEmbedding(chunk.content);
          
          // Validate embedding
          if (!validateEmbedding(result.embedding)) {
            console.warn(`Invalid embedding for chunk ${chunk.id}`);
            continue;
          }

          // Store embedding with enhanced metadata
          const success = await this.storeEnhancedEmbedding(
            queueRecord,
            chunk,
            result.embedding,
            result.tokenCount
          );

          if (success) successCount++;
        } catch (chunkError) {
          console.error(`Error processing chunk ${chunk.id}:`, chunkError);
        }
      }

      // Mark original queue item as completed if at least one chunk succeeded
      if (successCount > 0) {
        await this.completeQueueItem(queueRecord.id);
        return true;
      } else {
        await this.failEmbedding(queueRecord.id, 'Failed to process any chunks');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failEmbedding(queueRecord.id, errorMessage);
      return false;
    }
  }

  // Store embedding with enhanced metadata
  private async storeEnhancedEmbedding(
    queueRecord: QueueRecord,
    chunk: SemanticChunk,
    embedding: number[],
    tokenCount?: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('embeddings')
        .insert({
          content_type: queueRecord.content_type,
          content_id: queueRecord.content_id,
          content_hash: queueRecord.content_hash,
          embedding,
          content_text: chunk.content,
          token_count: tokenCount,
          status: 'completed',
          // Enhanced metadata from semantic chunking
          chunk_type: chunk.metadata.chunkType,
          hierarchy_level: chunk.metadata.hierarchyLevel,
          parent_chunk_id: chunk.metadata.parentChunkId,
          section_title: chunk.metadata.sectionTitle,
          semantic_density: chunk.metadata.semanticDensity,
          key_terms: chunk.metadata.keyTerms,
          sentence_count: chunk.metadata.sentenceCount,
          word_count: chunk.metadata.wordCount,
          has_code_block: chunk.metadata.hasCodeBlock,
          has_table: chunk.metadata.hasTable,
          has_list: chunk.metadata.hasList,
          chunk_language: chunk.metadata.language
        } as any);

      if (error) {
        console.error('Error storing enhanced embedding:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error storing enhanced embedding:', error);
      return false;
    }
  }

  // Complete queue item processing
  private async completeQueueItem(queueId: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('embedding_queue')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', queueId);

      if (error) {
        console.error('Error completing queue item:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error completing queue item:', error);
      return false;
    }
  }

  // Process batch of embeddings
  async processBatchEmbeddings(queueRecords: QueueRecord[]): Promise<number> {
    if (queueRecords.length === 0) return 0;

    try {
      // Preprocess all texts
      const processedTexts = queueRecords.map(record => 
        preprocessTextForEmbedding(record.content_text)
      );

      // Filter out empty texts
      const validIndices = processedTexts
        .map((text, index) => text ? index : -1)
        .filter(index => index !== -1);

      if (validIndices.length === 0) {
        // Fail all records
        await Promise.all(
          queueRecords.map(record => 
            this.failEmbedding(record.id, 'Empty content after preprocessing')
          )
        );
        return 0;
      }

      const validTexts = validIndices.map(i => processedTexts[i]);
      const validRecords = validIndices.map(i => queueRecords[i]);

      // Generate batch embeddings
      const result = await generateBatchEmbeddings(validTexts);
      
      // Process results
      let successCount = 0;
      const promises = result.embeddings.map(async (embedding, index) => {
        const record = validRecords[index];
        const tokenCount = result.tokenCounts?.[index];

        if (validateEmbedding(embedding)) {
          const success = await this.completeEmbedding(record.id, embedding, tokenCount);
          if (success) successCount++;
        } else {
          await this.failEmbedding(record.id, 'Invalid embedding vector');
        }
      });

      // Handle failed records (empty content)
      const failedRecords = queueRecords.filter((_, index) => !validIndices.includes(index));
      const failPromises = failedRecords.map(record => 
        this.failEmbedding(record.id, 'Empty content after preprocessing')
      );

      await Promise.all([...promises, ...failPromises]);
      return successCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Fail all records
      await Promise.all(
        queueRecords.map(record => 
          this.failEmbedding(record.id, errorMessage)
        )
      );
      
      return 0;
    }
  }

  // Complete embedding processing
  private async completeEmbedding(
    queueId: number,
    embedding: number[],
    tokenCount?: number
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('complete_embedding', {
        p_queue_id: queueId,
        p_embedding: `[${embedding.join(',')}]`,
        p_token_count: tokenCount
      } as any);

      if (error) {
        console.error('Error completing embedding:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error completing embedding:', error);
      return false;
    }
  }

  // Fail embedding processing
  private async failEmbedding(queueId: number, errorMessage: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('fail_embedding', {
        p_queue_id: queueId,
        p_error_message: errorMessage
      } as any);

      if (error) {
        console.error('Error failing embedding:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error failing embedding:', error);
      return false;
    }
  }

  // Semantic search
  async semanticSearch(
    queryText: string,
    options: {
      contentTypes?: ContentType[];
      similarityThreshold?: number;
      maxResults?: number;
      userId?: number;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      // Check search result cache first
      const { getCachedSearchResults, setCachedSearchResults, getCachedQueryEmbedding, setCachedQueryEmbedding } = await import('./embedding-cache');
      
      const cachedResults = getCachedSearchResults(queryText, options);
      if (cachedResults) {
        return cachedResults;
      }

      // Check query embedding cache
      const processedQuery = preprocessTextForEmbedding(queryText);
      let queryEmbedding = getCachedQueryEmbedding(processedQuery);
      
      if (!queryEmbedding) {
        // Generate query embedding
        const queryResult = await generateEmbedding(processedQuery);
        
        if (!validateEmbedding(queryResult.embedding)) {
          throw new Error('Invalid query embedding');
        }
        
        queryEmbedding = queryResult.embedding;
        // Cache the query embedding
        setCachedQueryEmbedding(processedQuery, queryEmbedding);
      }

      // Perform search
      const { data, error } = await this.supabase.rpc('semantic_search', {
        p_query_embedding: `[${queryEmbedding.join(',')}]`,
        p_content_types: options.contentTypes || null,
        p_similarity_threshold: options.similarityThreshold || 0.7,
        p_max_results: options.maxResults || 10,
        p_user_id: options.userId || null
      } as any);

      if (error) {
        console.error('Error performing semantic search:', error);
        return [];
      }

      const results = data || [];
      
      // Cache the search results
      setCachedSearchResults(queryText, options, results);
      
      return results;
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  // Get embedding by content
  async getEmbedding(contentType: ContentType, contentId: number): Promise<EmbeddingRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('embeddings')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('is_deleted', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No record found
        }
        console.error('Error getting embedding:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting embedding:', error);
      return null;
    }
  }

  // Get queue status
  async getQueueStatus(): Promise<{
    queued: number;
    processing: number;
    failed: number;
    total: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('embedding_queue')
        .select('status');

      if (error) {
        console.error('Error getting queue status:', error);
        return { queued: 0, processing: 0, failed: 0, total: 0 };
      }

      const counts = data.reduce(
        (acc: any, record: any) => {
          acc[record.status]++;
          acc.total++;
          return acc;
        },
        { queued: 0, processing: 0, failed: 0, completed: 0, total: 0 }
      );

      return counts;
    } catch (error) {
      console.error('Error getting queue status:', error);
      return { queued: 0, processing: 0, failed: 0, total: 0 };
    }
  }

  // Get embedding statistics
  async getEmbeddingStats(): Promise<{
    total: number;
    byContentType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('embeddings')
        .select('content_type, status')
        .eq('is_deleted', false);

      if (error) {
        console.error('Error getting embedding stats:', error);
        return { total: 0, byContentType: {}, byStatus: {} };
      }

      const stats = data.reduce(
        (acc: any, record: any) => {
          acc.total++;
          acc.byContentType[record.content_type] = (acc.byContentType[record.content_type] || 0) + 1;
          acc.byStatus[record.status] = (acc.byStatus[record.status] || 0) + 1;
          return acc;
        },
        { total: 0, byContentType: {} as Record<string, number>, byStatus: {} as Record<string, number> }
      );

      return stats;
    } catch (error) {
      console.error('Error getting embedding stats:', error);
      return { total: 0, byContentType: {}, byStatus: {} };
    }
  }

  // Cleanup old embeddings
  async cleanupOldEmbeddings(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.supabase
        .from('embeddings')
        .delete()
        .eq('status', 'outdated')
        .lt('updated_at', cutoffDate);

      if (error) {
        console.error('Error cleaning up old embeddings:', error);
        return 0;
      }

      return (data as any)?.length || 0;
    } catch (error) {
      console.error('Error cleaning up old embeddings:', error);
      return 0;
    }
  }

  // Requeue failed embeddings
  async requeueFailedEmbeddings(maxAge: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString();
      
      // First get the failed items
      const { data: failedItems, error: selectError } = await this.supabase
        .from('embedding_queue')
        .select('id')
        .eq('status', 'failed')
        .lt('updated_at', cutoffDate);

      if (selectError || !failedItems) {
        console.error('Error selecting failed embeddings:', selectError);
        return 0;
      }

      if (failedItems.length === 0) {
        return 0;
      }

      // Delete the failed items so they can be re-queued
      const { error: deleteError } = await this.supabase
        .from('embedding_queue')
        .delete()
        .in('id', failedItems.map((item: any) => item.id));

      if (deleteError) {
        console.error('Error deleting failed embeddings:', deleteError);
        return 0;
      }

      return failedItems.length;
    } catch (error) {
      console.error('Error requeuing failed embeddings:', error);
      return 0;
    }
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration for vector store');
    }

    vectorStoreInstance = new VectorStore(supabaseUrl, supabaseKey);
  }

  return vectorStoreInstance;
}

// Utility functions for common operations
export async function queueContentForEmbedding(
  contentType: ContentType,
  contentId: number,
  priority: number = 5
): Promise<boolean> {
  const vectorStore = getVectorStore();
  return vectorStore.queueForEmbedding(contentType, contentId, priority);
}

export async function searchSimilarContent(
  query: string,
  contentTypes?: ContentType[],
  maxResults: number = 10
): Promise<SearchResult[]> {
  const vectorStore = getVectorStore();
  return vectorStore.semanticSearch(query, {
    contentTypes,
    maxResults,
    similarityThreshold: 0.7
  });
}