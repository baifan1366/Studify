// PDF Processing Queue Service
// Manages background PDF processing tasks

import { createClient } from '@supabase/supabase-js';
import { extractPDFFromURL, extractPDFText } from './pdf-extractor';
import { generatePDFEmbeddings, getProcessingStatus } from './pdf-embedding-generator';

export interface PDFProcessingJob {
  id: string;
  attachmentId: number;
  status: 'pending' | 'extracting' | 'generating_embeddings' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface PDFProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  extractByPage?: boolean;
  batchSize?: number;
}

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, PDFProcessingJob>();

/**
 * Start PDF processing for an attachment
 */
export async function startPDFProcessing(
  attachmentId: number,
  options: PDFProcessingOptions = {}
): Promise<{ jobId: string; success: boolean; error?: string }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log(`🚀 Starting PDF processing for attachment ${attachmentId}`);
    
    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('course_attachments')
      .select('id, title, url, type, file_size')
      .eq('id', attachmentId)
      .single();
    
    if (attachmentError || !attachment) {
      throw new Error(`Attachment not found: ${attachmentError?.message || 'Unknown error'}`);
    }
    
    if (attachment.type !== 'pdf') {
      throw new Error(`Invalid attachment type: ${attachment.type}. Expected 'pdf'`);
    }
    
    if (!attachment.url) {
      throw new Error('Attachment URL is missing');
    }
    
    // Create job
    const jobId = `pdf_${attachmentId}_${Date.now()}`;
    const job: PDFProcessingJob = {
      id: jobId,
      attachmentId,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      startedAt: new Date(),
    };
    
    jobs.set(jobId, job);
    
    // Start processing in background (don't await)
    processPDFInBackground(jobId, attachment.url, attachmentId, options).catch(error => {
      console.error(`❌ Background processing failed for job ${jobId}:`, error);
      updateJob(jobId, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });
    });
    
    return {
      jobId,
      success: true,
    };
    
  } catch (error) {
    console.error('❌ Failed to start PDF processing:', error);
    return {
      jobId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process PDF in background
 */
async function processPDFInBackground(
  jobId: string,
  pdfUrl: string,
  attachmentId: number,
  options: PDFProcessingOptions
): Promise<void> {
  try {
    // Step 1: Extract text from PDF
    updateJob(jobId, {
      status: 'extracting',
      progress: 10,
      currentStep: 'Extracting text from PDF...',
    });
    
    console.log(`📄 Extracting text from PDF: ${pdfUrl}`);
    const extractionResult = await extractPDFFromURL(pdfUrl, {
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
      extractByPage: options.extractByPage,
    });
    
    if (!extractionResult.success || extractionResult.chunks.length === 0) {
      throw new Error(extractionResult.error || 'Failed to extract text from PDF');
    }
    
    console.log(`✅ Extracted ${extractionResult.chunks.length} chunks from PDF`);
    
    updateJob(jobId, {
      progress: 30,
      currentStep: `Extracted ${extractionResult.chunks.length} text chunks`,
    });
    
    // Step 2: Generate embeddings
    updateJob(jobId, {
      status: 'generating_embeddings',
      progress: 40,
      currentStep: 'Generating embeddings...',
    });
    
    console.log(`🔮 Generating embeddings for ${extractionResult.chunks.length} chunks`);
    const embeddingResult = await generatePDFEmbeddings(
      attachmentId,
      extractionResult.chunks,
      {
        batchSize: options.batchSize || 5,
        retryAttempts: 3,
        delayBetweenBatches: 1000,
      }
    );
    
    if (!embeddingResult.success) {
      console.warn(`⚠️ Some chunks failed: ${embeddingResult.failedChunks}/${embeddingResult.totalChunks}`);
    }
    
    console.log(`✅ Generated embeddings: ${embeddingResult.processedChunks}/${embeddingResult.totalChunks} succeeded`);
    
    // Step 3: Complete
    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      currentStep: `Completed: ${embeddingResult.processedChunks}/${embeddingResult.totalChunks} chunks processed`,
      completedAt: new Date(),
    });
    
    console.log(`✅ PDF processing completed for job ${jobId}`);
    
  } catch (error) {
    console.error(`❌ PDF processing failed for job ${jobId}:`, error);
    updateJob(jobId, {
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    });
    throw error;
  }
}

/**
 * Update job status
 */
function updateJob(jobId: string, updates: Partial<PDFProcessingJob>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    jobs.set(jobId, job);
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<PDFProcessingJob | null> {
  const job = jobs.get(jobId);
  
  if (!job) {
    return null;
  }
  
  // If job is completed or failed, also get final status from database
  if (job.status === 'completed' || job.status === 'failed') {
    try {
      const dbStatus = await getProcessingStatus(job.attachmentId);
      
      // Update job with database status
      job.currentStep = `${dbStatus.completedChunks}/${dbStatus.totalChunks} chunks completed`;
      
      if (dbStatus.overallStatus === 'failed') {
        job.status = 'failed';
        job.error = `${dbStatus.failedChunks} chunks failed`;
      }
    } catch (error) {
      console.error('Failed to get database status:', error);
    }
  }
  
  return job;
}

/**
 * Get all jobs for an attachment
 */
export function getJobsByAttachment(attachmentId: number): PDFProcessingJob[] {
  return Array.from(jobs.values()).filter(job => job.attachmentId === attachmentId);
}

/**
 * Clean up old completed jobs (older than 1 hour)
 */
export function cleanupOldJobs(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  for (const [jobId, job] of jobs.entries()) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      job.completedAt &&
      job.completedAt.getTime() < oneHourAgo
    ) {
      jobs.delete(jobId);
      console.log(`🧹 Cleaned up old job: ${jobId}`);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldJobs, 60 * 60 * 1000);
}

/**
 * Check if attachment has been processed
 */
export async function isAttachmentProcessed(attachmentId: number): Promise<boolean> {
  try {
    const status = await getProcessingStatus(attachmentId);
    return status.overallStatus === 'completed' && status.completedChunks > 0;
  } catch (error) {
    console.error('Failed to check attachment status:', error);
    return false;
  }
}

/**
 * Get processing statistics for an attachment
 */
export async function getAttachmentStatistics(attachmentId: number): Promise<{
  isProcessed: boolean;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  status: string;
}> {
  try {
    const status = await getProcessingStatus(attachmentId);
    return {
      isProcessed: status.overallStatus === 'completed',
      totalChunks: status.totalChunks,
      completedChunks: status.completedChunks,
      failedChunks: status.failedChunks,
      status: status.overallStatus,
    };
  } catch (error) {
    console.error('Failed to get attachment statistics:', error);
    return {
      isProcessed: false,
      totalChunks: 0,
      completedChunks: 0,
      failedChunks: 0,
      status: 'unknown',
    };
  }
}
