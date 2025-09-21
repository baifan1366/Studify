import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorize } from '@/utils/auth/server-guard'
import { createServerClient } from '@/utils/supabase/server'
import { Client } from '@upstash/qstash'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

// Validation schema
const documentPreviewSchema = z.object({
  attachmentId: z.number().int().positive(),
  documentType: z.enum(['pdf', 'text', 'office']),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
})

// Types
interface DocumentProcessingJob {
  id: string
  attachmentId: number
  documentType: string
  priority: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  userId: string
  createdAt: string
  updatedAt: string
  progress?: number
  error?: string
  messageId?: string // QStash message ID for tracking
  result?: {
    previewUrl?: string
    thumbnailUrl?: string
    pageCount?: number
    fileSize?: number
  }
}

/**
 * Queue a document for async processing
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authorize('student')
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = documentPreviewSchema.parse(body)

    const supabase = await createServerClient()
    // Check if attachment exists and user has access
    const { data: attachment, error: attachmentError } = await supabase
      .from('course_attachments')
      .select(`
        id,
        url,
        type,
        name,
        size,
        course_id,
        courses!inner(
          id,
          slug,
          creator_id,
          course_enrollments!inner(user_id)
        )
      `)
      .eq('id', validatedData.attachmentId)
      .or(`creator_id.eq.${authResult.payload.sub},course_enrollments.user_id.eq.${authResult.payload.sub}`)
      .maybeSingle()

    if (attachmentError || !attachment) {
      console.error('❌ Attachment access error:', attachmentError)
      return NextResponse.json({ 
        error: 'Attachment not found or access denied' 
      }, { status: 404 })
    }

    // Check if document is already being processed or completed
    const jobId = `doc_${validatedData.attachmentId}_${authResult.payload.sub}`
    
    // Try to get existing job from cache/database
    const existingJob = await getDocumentJob(jobId)
    if (existingJob && (existingJob.status === 'processing' || existingJob.status === 'completed')) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        progress: existingJob.progress,
        result: existingJob.result
      })
    }

    // Create new processing job
    const processingJob: DocumentProcessingJob = {
      id: jobId,
      attachmentId: validatedData.attachmentId,
      documentType: validatedData.documentType,
      priority: validatedData.priority,
      status: 'queued',
      userId: authResult.payload.sub,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0
    }

    // Store job in cache/database
    await storeDocumentJob(processingJob)

    // Queue the document processing job with QStash
    const qstashClient = new Client({
      token: process.env.QSTASH_TOKEN!,
    })
    const queueResult = await qstashClient.publishJSON({
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/workers/document-processor`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        jobId: processingJob.id,
        attachmentId: validatedData.attachmentId,
        documentType: validatedData.documentType,
        userId: authResult.payload.sub,
        attachmentUrl: attachment.url,
        attachmentName: attachment.name || 'document',
        attachmentSize: attachment.size
      },
      delay: validatedData.priority === 'high' ? 0 : validatedData.priority === 'normal' ? 5 : 30 // seconds
    })

    console.log('✅ Document processing job queued:', {
      jobId: processingJob.id,
      messageId: queueResult.messageId,
      attachmentId: validatedData.attachmentId,
      priority: validatedData.priority
    })

    // Update job with message ID
    processingJob.updatedAt = new Date().toISOString()
    await storeDocumentJob({ ...processingJob, messageId: queueResult.messageId })

    return NextResponse.json({
      success: true,
      jobId: processingJob.id,
      messageId: queueResult.messageId,
      status: 'queued',
      estimatedProcessingTime: getEstimatedProcessingTime(attachment.size, validatedData.documentType),
      progress: 0
    })

  } catch (error) {
    console.error('❌ Document preview queue error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to queue document processing' 
    }, { status: 500 })
  }
}

/**
 * Get document processing job status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authorize('student')
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter required' }, { status: 400 })
    }

    // Get job status
    const job = await getDocumentJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user owns this job
    if (job.userId !== authResult.payload.sub) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress || 0,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    })

  } catch (error) {
    console.error('❌ Document job status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get job status' 
    }, { status: 500 })
  }
}

// Helper functions (these would typically use Redis in production)
async function getDocumentJob(jobId: string): Promise<DocumentProcessingJob | null> {
  try {
    // In production, use Redis: await redis.get(`doc_job:${jobId}`)
    // For now, using in-memory storage (this is just for demo)
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()
    
    return data
  } catch {
    return null
  }
}

async function storeDocumentJob(job: DocumentProcessingJob): Promise<void> {
  try {
    // In production, use Redis: await redis.setex(`doc_job:${job.id}`, 3600, JSON.stringify(job))
    // For now, using Supabase (you'd need to create this table)
    const supabase = await createServerClient()
    await supabase
      .from('document_processing_jobs')
      .upsert([{
        id: job.id,
        attachment_id: job.attachmentId,
        document_type: job.documentType,
        priority: job.priority,
        status: job.status,
        user_id: job.userId,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
        progress: job.progress,
        error: job.error,
        result: job.result
      }])
  } catch (error) {
    console.error('❌ Failed to store document job:', error)
  }
}

function getEstimatedProcessingTime(fileSize: number = 0, documentType: string): number {
  // Estimate processing time based on file size and type
  const baseTimes = {
    pdf: 30,     // 30 seconds base
    text: 5,     // 5 seconds base  
    office: 45   // 45 seconds base
  }
  
  const sizeInMB = fileSize / (1024 * 1024)
  const baseTime = baseTimes[documentType as keyof typeof baseTimes] || 30
  
  // Add time based on file size (10 seconds per MB)
  return Math.ceil(baseTime + (sizeInMB * 10))
}