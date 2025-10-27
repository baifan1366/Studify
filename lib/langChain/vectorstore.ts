import { createClient } from '@supabase/supabase-js';
import { 
  generateEmbedding, 
  generateBatchEmbeddings,
  generateDualEmbedding,
  generateDualBatchEmbeddings,
  validateEmbedding, 
  validateDualEmbedding,
  preprocessTextForEmbedding,
  EmbeddingModel,
  DualEmbeddingResponse
} from './embedding';
import { chunkDocumentSemantically, SemanticChunk, EnhancedChunkMetadata } from './semantic-chunking';

// Database types for dual embedding
interface EmbeddingRecord {
  id: number;
  public_id: string;
  content_type: string;
  content_id: number;
  content_hash: string;
  // Dual embedding fields
  embedding?: number[]; // Legacy field for backwards compatibility
  embedding_e5_small?: number[];
  embedding_bge_m3?: number[];
  has_e5_embedding?: boolean;
  has_bge_embedding?: boolean;
  // Model tracking
  embedding_model?: string; // Legacy
  embedding_e5_model?: string;
  embedding_bge_model?: string;
  // Content and metadata
  content_text: string;
  language: string;
  token_count?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'outdated';
  error_message?: string;
  retry_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  embedding_created_at?: string;
  embedding_updated_at?: string;
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

export interface SearchResult {
  content_type: string;
  content_id: number;
  content_text: string;
  similarity: number;
  metadata: {
    created_at: string;
    updated_at: string;
    token_count?: number;
    embedding_model?: string;
    // Dual embedding metadata
    embedding_types?: string;
    individual_scores?: {
      e5_similarity?: number;
      bge_similarity?: number;
      combined_similarity?: number;
      weights?: { e5: number; bge: number };
    };
    has_e5_embedding?: boolean;
    has_bge_embedding?: boolean;
    chunk_type?: string;
    hierarchy_level?: number;
    word_count?: number;
    sentence_count?: number;
  };
}

interface DualSearchOptions {
  contentTypes?: ContentType[];
  similarityThreshold?: number;
  maxResults?: number;
  userId?: number;
  searchType?: 'e5_only' | 'bge_only' | 'hybrid';
  embeddingWeights?: { e5: number; bge: number };
}

// Content types enum
export const CONTENT_TYPES = {
  PROFILE: 'profile',
  POST: 'post',
  COMMENT: 'comment',
  COURSE: 'course',
  LESSON: 'lesson',
  AUTH_USER: 'auth_user',
  QUIZ_QUESTION: 'quiz_question'
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

  // Process a single embedding with dual embedding support
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

      // Process each chunk with dual embeddings
      let successCount = 0;
      for (const chunk of chunks) {
        try {
          // Generate dual embeddings for this chunk
          const dualResult = await generateDualEmbedding(chunk.content);
          
          // Validate embeddings
          const validation = validateDualEmbedding(dualResult);
          if (!validation.hasAnyValid) {
            console.warn(`No valid embeddings for chunk ${chunk.id}`);
            continue;
          }

          // Store dual embedding with enhanced metadata
          const success = await this.storeDualEmbedding(
            queueRecord,
            chunk,
            dualResult
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

  // Process single embedding (legacy support)
  async processLegacyEmbedding(queueRecord: QueueRecord): Promise<boolean> {
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
          // Generate E5 embedding for this chunk (legacy)
          const result = await generateEmbedding(chunk.content, 'e5');
          
          // Validate embedding
          if (!validateEmbedding(result.embedding, 384, 'e5')) {
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

  // Store dual embedding with enhanced metadata
  private async storeDualEmbedding(
    queueRecord: QueueRecord,
    chunk: SemanticChunk,
    dualResult: DualEmbeddingResponse
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('embeddings')
        .insert({
          content_type: queueRecord.content_type,
          content_id: queueRecord.content_id,
          content_hash: queueRecord.content_hash,
          // Dual embeddings
          embedding_e5_small: dualResult.e5_embedding,
          embedding_bge_m3: dualResult.bge_embedding,
          has_e5_embedding: !!dualResult.e5_embedding,
          has_bge_embedding: !!dualResult.bge_embedding,
          // Legacy embedding (use E5 if available)
          embedding: dualResult.e5_embedding,
          // Content and basic metadata
          content_text: chunk.content,
          token_count: dualResult.token_count,
          status: 'completed',
          embedding_created_at: new Date().toISOString(),
          embedding_updated_at: new Date().toISOString(),
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
        console.error('Error storing dual embedding:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error storing dual embedding:', error);
      return false;
    }
  }

  // Store embedding with enhanced metadata (legacy support)
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
          embedding_e5_small: embedding, // Also store in new column
          has_e5_embedding: true,
          has_bge_embedding: false,
          content_text: chunk.content,
          token_count: tokenCount,
          status: 'completed',
          embedding_created_at: new Date().toISOString(),
          embedding_updated_at: new Date().toISOString(),
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

  // Dual embedding semantic search
  async dualSemanticSearch(
    queryText: string,
    options: DualSearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        contentTypes,
        similarityThreshold = 0.7,
        maxResults = 10,
        userId,
        searchType = 'hybrid', // Using hybrid with both E5 and BGE
        embeddingWeights = { e5: 0.5, bge: 0.5 } // Equal weight for both embeddings
      } = options;

      // Check search result cache first
      const { getCachedSearchResults, setCachedSearchResults } = await import('./embedding-cache');
      const cacheKey = `${queryText}:${JSON.stringify(options)}`;
      const cachedResults = getCachedSearchResults(cacheKey, {});
      if (cachedResults) {
        return cachedResults;
      }

      const processedQuery = preprocessTextForEmbedding(queryText);
      let queryEmbeddingE5: number[] | null = null;
      let queryEmbeddingBGE: number[] | null = null;

      // Generate embeddings based on search type
      if ((searchType === 'e5_only' || searchType === 'hybrid') && embeddingWeights.e5 > 0) {
        try {
          const e5Result = await generateEmbedding(processedQuery, 'e5');
          if (validateEmbedding(e5Result.embedding, 384, 'e5')) {
            queryEmbeddingE5 = e5Result.embedding;
          }
        } catch (e5Error) {
          console.warn('⚠️ E5 embedding generation failed, continuing with BGE only:', e5Error instanceof Error ? e5Error.message : e5Error);
        }
      }

      if ((searchType === 'bge_only' || searchType === 'hybrid') && embeddingWeights.bge > 0) {
        try {
          const bgeResult = await generateEmbedding(processedQuery, 'bge');
          if (validateEmbedding(bgeResult.embedding, 1024, 'bge')) {
            queryEmbeddingBGE = bgeResult.embedding;
          }
        } catch (bgeError) {
          console.warn('⚠️ BGE embedding generation failed, continuing with E5 only:', bgeError instanceof Error ? bgeError.message : bgeError);
        }
      }

      // Ensure we have at least one valid embedding
      if (!queryEmbeddingE5 && !queryEmbeddingBGE) {
        throw new Error('Failed to generate any valid query embeddings');
      }

      // Call the appropriate search function
      let searchFunction: string;
      let searchParams: any;

      if (searchType === 'hybrid') {
        searchFunction = 'search_embeddings_hybrid'; // General-purpose hybrid search
        searchParams = {
          query_embedding_e5: queryEmbeddingE5 ? `[${queryEmbeddingE5.join(',')}]` : null,
          query_embedding_bge: queryEmbeddingBGE ? `[${queryEmbeddingBGE.join(',')}]` : null, // ✅ Enabled BGE
          content_types: contentTypes || null,
          match_threshold: similarityThreshold,
          match_count: maxResults,
          weight_e5: embeddingWeights.e5, // Use configured weights
          weight_bge: embeddingWeights.bge, // Use configured weights
          user_id: userId || null
        };
      } else if (searchType === 'e5_only') {
        searchFunction = 'search_embeddings_e5'; // General-purpose E5 search
        searchParams = {
          query_embedding: `[${queryEmbeddingE5!.join(',')}]`,
          content_types: contentTypes || null,
          match_threshold: similarityThreshold,
          match_count: maxResults,
          user_id: userId || null
        };
      } else { // bge_only
        searchFunction = 'search_embeddings_bge'; // General-purpose BGE search
        searchParams = {
          query_embedding: `[${queryEmbeddingBGE!.join(',')}]`,
          content_types: contentTypes || null,
          match_threshold: similarityThreshold,
          match_count: maxResults,
          user_id: userId || null
        };
      }

      // Perform search
      const { data, error } = await this.supabase.rpc(searchFunction, searchParams);

      if (error) {
        console.error(`Error performing ${searchType} search:`, error);
        
        // Fallback: If hybrid search fails, try enhanced search with E5
        if (searchFunction === 'search_embeddings_hybrid' && queryEmbeddingE5) {
          console.log('⚠️ Hybrid search failed, falling back to search_embeddings_enhanced');
          try {
            const { data: fallbackData, error: fallbackError } = await this.supabase.rpc('search_embeddings_enhanced', {
              query_embedding: `[${queryEmbeddingE5.join(',')}]`,
              content_types: contentTypes || null,
              similarity_threshold: similarityThreshold,
              max_results: maxResults
            } as any);
            
            if (!fallbackError && fallbackData) {
              console.log(`✅ Enhanced search fallback returned ${(fallbackData as any[]).length} results`);
              const fallbackResults = (fallbackData as SearchResult[]) || [];
              setCachedSearchResults(cacheKey, {}, fallbackResults);
              return fallbackResults;
            }
          } catch (fallbackErr) {
            console.error('Enhanced search fallback also failed:', fallbackErr);
          }
        }
        
        return [];
      }

      const results = data || [];
      
      // Cache the search results
      setCachedSearchResults(cacheKey, {}, results);
      
      return results;
    } catch (error) {
      console.error('Error in dual semantic search:', error);
      return [];
    }
  }

  // Legacy semantic search (backward compatibility)
  async semanticSearch(
    queryText: string,
    options: {
      contentTypes?: ContentType[];
      similarityThreshold?: number;
      maxResults?: number;
      userId?: number;
    } = {}
  ): Promise<SearchResult[]> {
    // Convert to dual search options and use E5 only for backward compatibility
    const dualOptions: DualSearchOptions = {
      ...options,
      searchType: 'e5_only'
    };
    
    return this.dualSemanticSearch(queryText, dualOptions);
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

  // Get dual embedding statistics
  async getDualEmbeddingStats(): Promise<{
    total: number;
    dualComplete: number;
    e5Only: number;
    bgeOnly: number;
    incomplete: number;
    dualCoveragePercent: number;
    byContentType: Record<string, any>;
    byStatus: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase.rpc('get_dual_embedding_statistics');

      if (error) {
        console.error('Error getting dual embedding stats:', error);
        return {
          total: 0,
          dualComplete: 0,
          e5Only: 0,
          bgeOnly: 0,
          incomplete: 0,
          dualCoveragePercent: 0,
          byContentType: {},
          byStatus: {}
        };
      }

      return data[0] || {
        total: 0,
        dualComplete: 0,
        e5Only: 0,
        bgeOnly: 0,
        incomplete: 0,
        dualCoveragePercent: 0,
        byContentType: {},
        byStatus: {}
      };
    } catch (error) {
      console.error('Error getting dual embedding stats:', error);
      return {
        total: 0,
        dualComplete: 0,
        e5Only: 0,
        bgeOnly: 0,
        incomplete: 0,
        dualCoveragePercent: 0,
        byContentType: {},
        byStatus: {}
      };
    }
  }

  // Get legacy embedding statistics (backward compatibility)
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

  // Find embeddings that need dual embedding backfill
  async findIncompleteEmbeddings(
    contentTypeFilter?: ContentType,
    priorityMissing: 'e5' | 'bge' | 'any' = 'bge',
    limit: number = 50
  ): Promise<{
    id: number;
    content_type: string;
    content_id: number;
    content_text: string;
    has_e5_embedding: boolean;
    has_bge_embedding: boolean;
    missing_types: string[];
    priority_score: number;
    created_at: string;
  }[]> {
    try {
      const { data, error } = await this.supabase.rpc('find_incomplete_dual_embeddings', {
        limit_count: limit,
        content_type_filter: contentTypeFilter || null,
        priority_missing: priorityMissing
      } as any);

      if (error) {
        console.error('Error finding incomplete embeddings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error finding incomplete embeddings:', error);
      return [];
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

// Dual embedding search utility functions
export async function searchSimilarContentDual(
  query: string,
  options: DualSearchOptions = {}
): Promise<SearchResult[]> {
  const vectorStore = getVectorStore();
  return vectorStore.dualSemanticSearch(query, {
    similarityThreshold: 0.7,
    maxResults: 10,
    searchType: 'hybrid',
    embeddingWeights: { e5: 0.4, bge: 0.6 },
    ...options
  });
}

export async function searchWithE5Only(
  query: string,
  contentTypes?: ContentType[],
  maxResults: number = 10
): Promise<SearchResult[]> {
  return searchSimilarContentDual(query, {
    contentTypes,
    maxResults,
    searchType: 'e5_only'
  });
}

export async function searchWithBGEOnly(
  query: string,
  contentTypes?: ContentType[],
  maxResults: number = 10
): Promise<SearchResult[]> {
  return searchSimilarContentDual(query, {
    contentTypes,
    maxResults,
    searchType: 'bge_only'
  });
}

export async function searchWithHybrid(
  query: string,
  contentTypes?: ContentType[],
  maxResults: number = 10,
  embeddingWeights: { e5: number; bge: number } = { e5: 0.4, bge: 0.6 }
): Promise<SearchResult[]> {
  return searchSimilarContentDual(query, {
    contentTypes,
    maxResults,
    searchType: 'hybrid',
    embeddingWeights
  });
}

// Dual embedding statistics utility
export async function getDualEmbeddingStatistics(): Promise<{
  total: number;
  dualComplete: number;
  e5Only: number;
  bgeOnly: number;
  incomplete: number;
  dualCoveragePercent: number;
  byContentType: Record<string, any>;
  byStatus: Record<string, number>;
}> {
  const vectorStore = getVectorStore();
  return vectorStore.getDualEmbeddingStats();
}

// Find content that needs dual embedding backfill
export async function findContentNeedingBackfill(
  contentType?: ContentType,
  priorityMissing: 'e5' | 'bge' | 'any' = 'bge',
  limit: number = 50
): Promise<{
  id: number;
  content_type: string;
  content_id: number;
  content_text: string;
  has_e5_embedding: boolean;
  has_bge_embedding: boolean;
  missing_types: string[];
  priority_score: number;
  created_at: string;
}[]> {
  const vectorStore = getVectorStore();
  return vectorStore.findIncompleteEmbeddings(contentType, priorityMissing, limit);
}