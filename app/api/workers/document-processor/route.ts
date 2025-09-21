import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { z } from 'zod'
import { File as MegaFile } from 'megajs'
import { createServerClient } from '@/utils/supabase/server'

// Worker payload schema
const workerPayloadSchema = z.object({
  jobId: z.string(),
  attachmentId: z.number(),
  documentType: z.enum(['pdf', 'text', 'office']),
  userId: z.string(),
  attachmentUrl: z.string(),
  attachmentName: z.string(),
  attachmentSize: z.number().optional()
})

// Document processing results interface
interface ProcessingResult {
  previewUrl?: string
  thumbnailUrl?: string
  pageCount?: number
  fileSize?: number
  textContent?: string
  error?: string
}

/**
 * QStash worker for processing documents
 */
async function documentProcessorHandler(request: NextRequest) {
  try {
    console.log('🔄 Document processor worker started')

    // Parse and validate payload
    const payload = await request.json()
    const validatedData = workerPayloadSchema.parse(payload)

    console.log('📋 Processing document job:', {
      jobId: validatedData.jobId,
      attachmentId: validatedData.attachmentId,
      documentType: validatedData.documentType,
      fileSize: validatedData.attachmentSize
    })

    // Update job status to processing
    await updateJobStatus(validatedData.jobId, {
      status: 'processing',
      progress: 10,
      updatedAt: new Date().toISOString()
    })

    // Process the document based on type
    let result: ProcessingResult
    
    switch (validatedData.documentType) {
      case 'pdf':
        result = await processPdf(validatedData)
        break
      case 'text':
        result = await processText(validatedData)
        break
      case 'office':
        result = await processOfficeDocument(validatedData)
        break
      default:
        throw new Error(`Unsupported document type: ${validatedData.documentType}`)
    }

    // Update job as completed
    await updateJobStatus(validatedData.jobId, {
      status: 'completed',
      progress: 100,
      result: result,
      updatedAt: new Date().toISOString()
    })

    console.log('✅ Document processing completed:', {
      jobId: validatedData.jobId,
      attachmentId: validatedData.attachmentId
    })

    return NextResponse.json({ 
      success: true, 
      jobId: validatedData.jobId,
      result: result
    })

  } catch (error) {
    console.error('❌ Document processing error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
    
    // Try to update job as failed if we have jobId
    try {
      const payload = await request.json()
      if (payload.jobId) {
        await updateJobStatus(payload.jobId, {
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (updateError) {
      console.error('❌ Failed to update job status:', updateError)
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
}

/**
 * Process PDF documents
 */
async function processPdf(data: z.infer<typeof workerPayloadSchema>): Promise<ProcessingResult> {
  console.log('📄 Processing PDF document...')
  
  await updateJobProgress(data.jobId, 20, 'Downloading PDF from MEGA...')

  try {
    // Download PDF from MEGA
    const { fileBuffer, actualSize } = await downloadMegaFile(data.attachmentUrl)
    
    await updateJobProgress(data.jobId, 50, 'Processing PDF content...')

    // For PDF processing, we could use pdf-parse or similar libraries
    // For now, we'll create a preview URL using the attachment streaming endpoint
    const previewUrl = `/api/attachments/${data.attachmentId}/stream`
    
    await updateJobProgress(data.jobId, 80, 'Generating thumbnail...')

    // In a real implementation, you might generate thumbnails here
    // For now, we'll just return the streaming URL
    
    return {
      previewUrl: previewUrl,
      fileSize: actualSize,
      pageCount: 1 // Would be calculated from actual PDF
    }

  } catch (error) {
    console.error('❌ PDF processing failed:', error)
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Process text documents
 */
async function processText(data: z.infer<typeof workerPayloadSchema>): Promise<ProcessingResult> {
  console.log('📝 Processing text document...')
  
  await updateJobProgress(data.jobId, 20, 'Downloading text file...')

  try {
    const { fileBuffer } = await downloadMegaFile(data.attachmentUrl)
    
    await updateJobProgress(data.jobId, 60, 'Extracting text content...')

    // Convert buffer to text
    const textContent = fileBuffer.toString('utf-8')
    
    await updateJobProgress(data.jobId, 90, 'Creating preview...')

    return {
      previewUrl: `/api/attachments/${data.attachmentId}/stream`,
      textContent: textContent.substring(0, 5000), // First 5000 chars for preview
      fileSize: fileBuffer.length
    }

  } catch (error) {
    console.error('❌ Text processing failed:', error)
    throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Process Office documents
 */
async function processOfficeDocument(data: z.infer<typeof workerPayloadSchema>): Promise<ProcessingResult> {
  console.log('📊 Processing Office document...')
  
  await updateJobProgress(data.jobId, 20, 'Downloading Office document...')

  try {
    const { fileBuffer, actualSize } = await downloadMegaFile(data.attachmentUrl)
    
    await updateJobProgress(data.jobId, 70, 'Processing Office document...')

    // For Office documents, we'll use the streaming endpoint
    // In a real implementation, you might convert to PDF or extract content
    const previewUrl = `/api/attachments/${data.attachmentId}/stream`
    
    return {
      previewUrl: previewUrl,
      fileSize: actualSize
    }

  } catch (error) {
    console.error('❌ Office document processing failed:', error)
    throw new Error(`Office document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Download file from MEGA URL
 */
async function downloadMegaFile(megaUrl: string): Promise<{ fileBuffer: Buffer, actualSize: number }> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Starting MEGA download:', megaUrl)
      
      const megaFile = MegaFile.fromURL(megaUrl)
      
      // Load file metadata
      megaFile.loadAttributes((error) => {
        if (error) {
          reject(new Error(`Failed to load MEGA file attributes: ${error.message}`))
          return
        }

        console.log('📁 MEGA file info:', {
          name: megaFile.name,
          size: megaFile.size
        })

        // Check file size limit (100MB for worker processing)
        const maxSizeBytes = 100 * 1024 * 1024 // 100MB
        if (megaFile.size && megaFile.size > maxSizeBytes) {
          reject(new Error(`File too large (${(megaFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum size for processing is 100MB.`))
          return
        }

        // Download file
        const chunks: Buffer[] = []
        let downloadedSize = 0
        
        const downloadStream = megaFile.download({})
        
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
          downloadedSize += chunk.length
        })

        downloadStream.on('end', () => {
          try {
            const fileBuffer = Buffer.concat(chunks)
            console.log('✅ MEGA download completed:', {
              downloadedSize: downloadedSize,
              bufferSize: fileBuffer.length
            })
            
            resolve({ 
              fileBuffer: fileBuffer, 
              actualSize: fileBuffer.length 
            })
          } catch (err) {
            reject(new Error(`Failed to process downloaded data: ${err instanceof Error ? err.message : 'Unknown error'}`))
          }
        })

        downloadStream.on('error', (err: Error) => {
          reject(new Error(`MEGA download failed: ${err.message}`))
        })
      })
      
    } catch (error) {
      reject(new Error(`MEGA processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

/**
 * Update job status in database
 */
async function updateJobStatus(jobId: string, updates: any): Promise<void> {
  try {
    const supabase = await createServerClient()
    await supabase
      .from('document_processing_jobs')
      .update(updates)
      .eq('id', jobId)
  } catch (error) {
    console.error('❌ Failed to update job status:', error)
  }
}

/**
 * Update job progress
 */
async function updateJobProgress(jobId: string, progress: number, stage: string): Promise<void> {
  console.log(`📊 Job ${jobId}: ${progress}% - ${stage}`)
  
  await updateJobStatus(jobId, {
    progress: progress,
    stage: stage,
    updatedAt: new Date().toISOString()
  })
}

// Export with QStash signature verification
export const POST = process.env.NODE_ENV === 'development' || !process.env.QSTASH_CURRENT_SIGNING_KEY
  ? documentProcessorHandler
  : verifySignatureAppRouter(documentProcessorHandler)
