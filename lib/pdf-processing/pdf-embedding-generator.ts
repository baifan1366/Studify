// PDF Embedding Generation Service
// Generates embeddings for PDF chunks and stores them in database

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../langChain/embedding';
import { PDFChunk } from './pdf-extractor';

export interface EmbeddingGenerationResult {
  success: boolean;
  processedChunks: number;
  failedChunks: number;
  totalChunks: number;
  errors: Array<{ chunkIndex: number; error: string }>;
}

export interface EmbeddingGenerationOptions {
  batchSize?: number; // Number of chunks to process in parallel
  retryAttempts?: number; // Number of retry attempts for failed chunks
  delayBetweenBatches?: number; // Delay in ms between batches
}

const DEFAULT_OPTIONS: Required<EmbeddingGenerationOptions> = {
  batchSize: 5,
  retryAttempts: 3,
  delayBetweenBatches: 1000,
};

/**
 * Generate embeddings for PDF chunks and store in database
 */
export async function generatePDFEmbeddings(
  attachmentId: number,
  chunks: PDFChunk[],
  options: EmbeddingGenerationOptions = {}
): Promise<EmbeddingGenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log(`🚀 Starting embedding generation for ${chunks.length} chunks (attachment ${attachmentId})`);
  
  let processedChunks = 0;
  let failedChunks = 0;
  const errors: Array<{ chunkIndex: number; error: string }> = [];
  
  try {
    // Step 1: Insert all chunks with pending status
    console.log('📝 Inserting chunks into database...');
    const chunkRecords = chunks.map(chunk => ({
      attachment_id: attachmentId,
      content_text: chunk.content,
      page_number: chunk.pageNumber,
      section_title: chunk.sectionTitle,
      chunk_index: chunk.chunkIndex,
      chunk_type: chunk.chunkType,
      word_count: chunk.wordCount,
      status: 'pending',
    }));
    
    const { error: insertError } = await supabase
      .from('document_embeddings')
      .upsert(chunkRecords, {
        onConflict: 'attachment_id,chunk_index',
        ignoreDuplicates: false,
      });
    
    if (insertError) {
      console.error('❌ Failed to insert chunks:', insertError);
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }
    
    console.log('✅ Chunks inserted successfully');
    
    // Step 2: Process chunks in batches
    for (let i = 0; i < chunks.length; i += opts.batchSize) {
      const batch = chunks.slice(i, i + opts.batchSize);
      const batchNum = Math.floor(i / opts.batchSize) + 1;
      const totalBatches = Math.ceil(chunks.length / opts.batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(chunk => processChunk(supabase, attachmentId, chunk, opts.retryAttempts))
      );
      
      // Count results
      batchResults.forEach((result, idx) => {
        const chunk = batch[idx];
        if (result.status === 'fulfilled' && result.value) {
          processedChunks++;
        } else {
          failedChunks++;
          const error = result.status === 'rejected' ? result.reason : 'Unknown error';
          errors.push({
            chunkIndex: chunk.chunkIndex,
            error: error instanceof Error ? error.message : String(error),
          });
          console.error(`❌ Failed to process chunk ${chunk.chunkIndex}:`, error);
        }
      });
      
      // Delay between batches to avoid rate limiting
      if (i + opts.batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, opts.delayBetweenBatches));
      }
    }
    
    console.log(`✅ Embedding generation completed: ${processedChunks} succeeded, ${failedChunks} failed`);
    
    return {
      success: failedChunks === 0,
      processedChunks,
      failedChunks,
      totalChunks: chunks.length,
      errors,
    };
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return {
      success: false,
      processedChunks,
      failedChunks: chunks.length - processedChunks,
      totalChunks: chunks.length,
      errors: [{
        chunkIndex: -1,
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
    };
  }
}

/**
 * Process a single chunk: generate embeddings and update database
 */
async function processChunk(
  supabase: any,
  attachmentId: number,
  chunk: PDFChunk,
  retryAttempts: number
): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retryAttempts} for chunk ${chunk.chunkIndex}`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      
      // Update status to processing
      await supabase
        .from('document_embeddings')
        .update({ status: 'processing' })
        .eq('attachment_id', attachmentId)
        .eq('chunk_index', chunk.chunkIndex);
      
      // Generate E5 embedding
      console.log(`🔮 Generating E5 embedding for chunk ${chunk.chunkIndex}...`);
      const e5Result = await generateEmbedding(chunk.content, 'e5');
      
      if (!e5Result.embedding || e5Result.embedding.length !== 768) {
        throw new Error(`Invalid E5 embedding: expected 768 dimensions, got ${e5Result.embedding?.length || 0}`);
      }
      
      // Generate BGE embedding
      console.log(`🔮 Generating BGE embedding for chunk ${chunk.chunkIndex}...`);
      const bgeResult = await generateEmbedding(chunk.content, 'bge');
      
      if (!bgeResult.embedding || bgeResult.embedding.length !== 1024) {
        throw new Error(`Invalid BGE embedding: expected 1024 dimensions, got ${bgeResult.embedding?.length || 0}`);
      }
      
      // Update database with embeddings
      const { error: updateError } = await supabase
        .from('document_embeddings')
        .update({
          embedding_e5: `[${e5Result.embedding.join(',')}]`,
          embedding_bge_m3: `[${bgeResult.embedding.join(',')}]`,
          has_e5_embedding: true,
          has_bge_embedding: true,
          status: 'completed',
          error_message: null,
        })
        .eq('attachment_id', attachmentId)
        .eq('chunk_index', chunk.chunkIndex);
      
      if (updateError) {
        throw new Error(`Failed to update database: ${updateError.message}`);
      }
      
      console.log(`✅ Chunk ${chunk.chunkIndex} processed successfully`);
      return true;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt + 1} failed for chunk ${chunk.chunkIndex}:`, lastError.message);
    }
  }
  
  // All attempts failed, mark as failed
  try {
    await supabase
      .from('document_embeddings')
      .update({
        status: 'failed',
        error_message: lastError?.message || 'Unknown error',
      })
      .eq('attachment_id', attachmentId)
      .eq('chunk_index', chunk.chunkIndex);
  } catch (error) {
    console.error('❌ Failed to update error status:', error);
  }
  
  return false;
}

/**
 * Get processing status for an attachment
 */
export async function getProcessingStatus(attachmentId: number): Promise<{
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  processingChunks: number;
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed';
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase
    .rpc('get_document_processing_status', { p_attachment_id: attachmentId })
    .single<{
      total_chunks: number;
      completed_chunks: number;
      failed_chunks: number;
      processing_chunks: number;
      overall_status: 'pending' | 'processing' | 'completed' | 'failed';
    }>();
  
  if (error || !data) {
    console.error('❌ Failed to get processing status:', error);
    return {
      totalChunks: 0,
      completedChunks: 0,
      failedChunks: 0,
      processingChunks: 0,
      overallStatus: 'pending',
    };
  }
  
  return {
    totalChunks: data.total_chunks || 0,
    completedChunks: data.completed_chunks || 0,
    failedChunks: data.failed_chunks || 0,
    processingChunks: data.processing_chunks || 0,
    overallStatus: data.overall_status || 'pending',
  };
}

/**
 * Retry failed chunks for an attachment
 */
export async function retryFailedChunks(
  attachmentId: number,
  options: EmbeddingGenerationOptions = {}
): Promise<EmbeddingGenerationResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log(`🔄 Retrying failed chunks for attachment ${attachmentId}`);
  
  // Get failed chunks
  const { data: failedChunks, error } = await supabase
    .from('document_embeddings')
    .select('*')
    .eq('attachment_id', attachmentId)
    .eq('status', 'failed');
  
  if (error || !failedChunks || failedChunks.length === 0) {
    console.log('ℹ️ No failed chunks to retry');
    return {
      success: true,
      processedChunks: 0,
      failedChunks: 0,
      totalChunks: 0,
      errors: [],
    };
  }
  
  // Convert to PDFChunk format
  const chunks: PDFChunk[] = failedChunks.map(chunk => ({
    content: chunk.content_text,
    pageNumber: chunk.page_number,
    chunkIndex: chunk.chunk_index,
    chunkType: chunk.chunk_type as 'paragraph' | 'section' | 'page',
    sectionTitle: chunk.section_title,
    wordCount: chunk.word_count,
  }));
  
  // Process chunks
  return generatePDFEmbeddings(attachmentId, chunks, options);
}
