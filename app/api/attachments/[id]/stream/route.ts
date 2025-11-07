import { NextRequest, NextResponse } from 'next/server'
import { createAttachmentAdminClient } from '@/utils/supabase/server'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { Storage, File } from 'megajs'

// Global MEGA storage instance for connection pooling
let globalStorage: Storage | null = null
let storageExpiry: number = 0
const STORAGE_REUSE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CHUNK_SIZE = 1024 * 1024 // 1MB chunks
const MEMORY_LIMIT = 50 * 1024 * 1024 // 50MB memory limit (increased for PDFs and large files)
const PDF_MEMORY_LIMIT = 100 * 1024 * 1024 // 100MB for PDFs specifically
const STREAMING_TIMEOUT = 60000 // 60 seconds streaming timeout (increased for large files)
const PDF_STREAMING_TIMEOUT = 120000 // 120 seconds for PDFs specifically

// Enhanced logging utility
const logStep = (step: string, data: any = {}) => {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    step,
    ...data,
    memoryUsage: process.memoryUsage ? {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    } : 'N/A'
  }
}

const logError = (step: string, error: any, data: any = {}) => {
  const timestamp = new Date().toISOString()
  const errorData = {
    timestamp,
    step,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    ...data
  }
  console.error(`❌ [STREAMING_ERROR] ${step}`, JSON.stringify(errorData, null, 2))
}

/**
 * GET /api/attachments/[id]/stream
 * Stream video content from MEGA storage with range request support
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStartTime = Date.now()
  const requestId = Math.random().toString(36).substr(2, 9)
  
  logStep('REQUEST_START', {
    requestId,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    referer: request.headers.get('referer'),
    range: request.headers.get('range')
  })
  
  let attachmentData: CourseAttachment | null = null
  
  try {
    const { id } = await params
    const attachmentId = parseInt(id, 10)
    
    logStep('VALIDATION', {
      requestId,
      attachmentId,
      rawId: id,
      isValid: !isNaN(attachmentId)
    })

    if (isNaN(attachmentId)) {
      logError('VALIDATION_FAILED', new Error('Invalid attachment ID'), {
        requestId,
        id
      })
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      )
    }

    // Get attachment metadata from database
    const dbStartTime = Date.now()
    logStep('DATABASE_QUERY_START', {
      requestId,
      attachmentId
    })
    
    const supabase = await createAttachmentAdminClient()
    
    const { data: attachment, error } = await supabase
      .from('course_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single()
    
    const dbDuration = Date.now() - dbStartTime
    logStep('DATABASE_QUERY_COMPLETE', {
      requestId,
      duration: dbDuration + 'ms',
      found: !!attachment,
      error: error ? error.code : null
    })

    if (error) {
      logError('DATABASE_ERROR', error, {
        requestId,
        attachmentId,
        errorCode: error.code
      })
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }
      throw new Error(`Database error: ${error.message}`)
    }

    attachmentData = attachment as CourseAttachment
    logStep('ATTACHMENT_RETRIEVED', {
      requestId,
      id: attachmentData.id,
      url: attachmentData.url?.substring(0, 50) + '...'
    })

    if (!attachmentData.url) {
      logError('NO_URL_ERROR', new Error('Attachment URL not found'), {
        requestId,
        attachmentId
      })
      return NextResponse.json(
        { error: 'Attachment URL not found' },
        { status: 404 }
      )
    }

    // Check if the URL is a MEGA URL
    if (!attachmentData.url.includes('mega.nz')) {
      logError('NON_MEGA_URL_ERROR', new Error('Non-MEGA URL not supported'), {
        requestId,
        url: attachmentData.url.substring(0, 100)
      })
      return NextResponse.json(
        { error: 'Only MEGA attachments are supported for streaming' },
        { status: 400 }
      )
    }

    // Get MEGA credentials
    const email = process.env.MEGA_EMAIL
    const password = process.env.MEGA_PASSWORD
    
    logStep('MEGA_CREDENTIALS_CHECK', {
      requestId,
      hasEmail: !!email,
      hasPassword: !!password
    })

    if (!email || !password) {
      logError('MEGA_CREDENTIALS_MISSING', new Error('MEGA credentials not configured'), {
        requestId
      })
      return NextResponse.json(
        { error: 'MEGA credentials not configured' },
        { status: 500 }
      )
    }

    // Parse range header for streaming
    const range = request.headers.get('range')
    
    logStep('RANGE_HEADER_PARSED', {
      requestId,
      range,
      hasRange: !!range
    })
    
    try {
      // Get or create MEGA storage instance with connection pooling
      let storage = globalStorage
      const megaStartTime = Date.now()
      
      if (!storage || Date.now() > storageExpiry) {
        logStep('MEGA_STORAGE_CREATE_START', {
          requestId,
          reason: !storage ? 'no_instance' : 'expired',
          cacheAge: storage ? Date.now() - (storageExpiry - STORAGE_REUSE_DURATION) : 0
        })
        
        const authStartTime = Date.now()
        
        storage = new Storage({
          email,
          password,
          keepalive: true,
          autologin: true
        })
        
        logStep('MEGA_STORAGE_CREATED', {
          requestId,
          authStartTime
        })
        
        // Set timeout for authentication with enhanced error handling
        const authTimeout = new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('MEGA authentication timeout after 15s')
            logError('MEGA_AUTH_TIMEOUT', error, {
              requestId,
              duration: Date.now() - authStartTime
            })
            reject(error)
          }, 15000)
        })
        
        try {
          await Promise.race([storage.ready, authTimeout])
          const authDuration = Date.now() - authStartTime
          
          logStep('MEGA_AUTH_SUCCESS', {
            requestId,
            duration: authDuration + 'ms'
          })
          
          globalStorage = storage
          storageExpiry = Date.now() + STORAGE_REUSE_DURATION
        } catch (authError) {
          logError('MEGA_AUTH_FAILED', authError, {
            requestId,
            duration: Date.now() - authStartTime
          })
          throw authError
        }
      } else {
        const cacheAge = Date.now() - (storageExpiry - STORAGE_REUSE_DURATION)
        logStep('MEGA_STORAGE_REUSE', {
          requestId,
          cacheAge: cacheAge + 'ms'
        })
      }

      // Parse MEGA URL to get file from storage
      const fileParseStartTime = Date.now()
      logStep('MEGA_FILE_PARSE_START', {
        requestId,
        url: attachmentData.url.substring(0, 50) + '...'
      })
      
      const file = File.fromURL(attachmentData.url)
      logStep('MEGA_FILE_OBJECT_CREATED', {
        requestId
      })
      
      try {
        await file.loadAttributes()
        const fileLoadDuration = Date.now() - fileParseStartTime
        
        logStep('MEGA_FILE_ATTRIBUTES_LOADED', {
          requestId,
          duration: fileLoadDuration + 'ms'
        })
      } catch (fileError) {
        logError('MEGA_FILE_ATTRIBUTES_FAILED', fileError, {
          requestId,
          duration: Date.now() - fileParseStartTime
        })
        throw fileError
      }

      const fileSize = file.size || 0
      const fileName = file.name || `attachment-${attachmentId}`
      
      logStep('FILE_INFO_RETRIEVED', {
        requestId,
        fileName,
        fileSize,
        fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
        totalProcessingTime: Date.now() - requestStartTime + 'ms'
      })

      // Determine content type based on file extension
      const getContentType = (filename: string): string => {
        const ext = filename.toLowerCase().split('.').pop()
        switch (ext) {
          // Video formats
          case 'mp4': return 'video/mp4'
          case 'webm': return 'video/webm'
          case 'ogg': return 'video/ogg'
          case 'avi': return 'video/x-msvideo'
          case 'mov': return 'video/quicktime'
          case 'wmv': return 'video/x-ms-wmv'
          case 'flv': return 'video/x-flv'
          case 'm4v': return 'video/x-m4v'
          // Document formats
          case 'pdf': return 'application/pdf'
          case 'doc': return 'application/msword'
          case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          case 'xls': return 'application/vnd.ms-excel'
          case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          case 'ppt': return 'application/vnd.ms-powerpoint'
          case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          // Text formats
          case 'txt': return 'text/plain'
          case 'md': return 'text/markdown'
          case 'json': return 'application/json'
          case 'xml': return 'application/xml'
          case 'csv': return 'text/csv'
          // Image formats
          case 'jpg': case 'jpeg': return 'image/jpeg'
          case 'png': return 'image/png'
          case 'gif': return 'image/gif'
          case 'webp': return 'image/webp'
          case 'svg': return 'image/svg+xml'
          default: return 'application/octet-stream'
        }
      }

      const contentType = getContentType(fileName)

      // Handle range requests with true streaming
      if (range) {
        logStep('RANGE_REQUEST_PROCESSING', {
          requestId,
          range
        })
        
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + MAX_CHUNK_SIZE - 1, fileSize - 1)
        const chunkSize = (end - start) + 1
        
        logStep('RANGE_DETAILS_PARSED', {
          requestId,
          start,
          end,
          chunkSize,
          chunkSizeMB: (chunkSize / 1024 / 1024).toFixed(2)
        })

        // Determine memory limit based on file type
        const isPdf = contentType === 'application/pdf'
        const effectiveMemoryLimit = isPdf ? PDF_MEMORY_LIMIT : MEMORY_LIMIT
        
        logStep('MEMORY_LIMIT_DETERMINED', {
          requestId,
          isPdf,
          contentType,
          effectiveMemoryLimit: effectiveMemoryLimit / 1024 / 1024 + 'MB',
          chunkSize: chunkSize / 1024 / 1024 + 'MB'
        })
        
        // Prevent memory overflow for large chunks
        if (chunkSize > effectiveMemoryLimit) {
          logError('CHUNK_SIZE_EXCEEDED', new Error('Chunk size exceeds memory limit'), {
            requestId,
            chunkSize,
            effectiveMemoryLimit,
            isPdf
          })
          
          // Fallback to direct MEGA download for large chunks
          logStep('FALLBACK_REDIRECT', {
            requestId,
            reason: 'chunk_size_exceeded',
            fallbackUrl: attachmentData.url
          })
          
          return NextResponse.redirect(attachmentData.url, 302)
        }

        // Create true streaming response with immediate chunk serving
        const downloadStartTime = Date.now()
        logStep('STREAMING_START', {
          requestId,
          strategy: 'true_streaming'
        })
        
        const stream = new ReadableStream({
          async start(controller) {
            let isControllerActive = true
            
            try {
              logStep('MEGA_DOWNLOAD_INITIATED', {
                requestId,
                start,
                end: end + 1
              })
              
              const downloadStream = file.download({ start, end: end + 1 })
              let totalReceived = 0
              let chunkCount = 0
              let lastProgressLog = Date.now()
              
              for await (const chunk of downloadStream) {
                const buffer = Buffer.from(chunk)
                totalReceived += buffer.length
                chunkCount++
                
                // Log progress every 5 seconds or every 50 chunks
                const now = Date.now()
                if (chunkCount % 50 === 0 || (now - lastProgressLog) > 5000) {
                  logStep('DOWNLOAD_PROGRESS', {
                    requestId,
                    chunkCount,
                    totalReceived,
                    receivedMB: (totalReceived / 1024 / 1024).toFixed(2),
                    duration: Date.now() - downloadStartTime + 'ms',
                    progress: ((totalReceived / chunkSize) * 100).toFixed(1) + '%'
                  })
                  lastProgressLog = now
                }
                
                // Prevent memory overflow
                if (totalReceived > effectiveMemoryLimit) {
                  logError('MEMORY_LIMIT_EXCEEDED', new Error('Memory limit exceeded during download'), {
                    requestId,
                    totalReceived,
                    effectiveMemoryLimit,
                    isPdf
                  })
                  isControllerActive = false
                  controller.error(new Error('Memory limit exceeded'))
                  return
                }
                
                // Enqueue chunk immediately (true streaming) - only if controller is active
                if (isControllerActive) {
                  try {
                    controller.enqueue(buffer)
                  } catch (enqueueError) {
                    logError('ENQUEUE_ERROR', enqueueError, {
                      requestId,
                      message: 'Controller may be closed'
                    })
                    isControllerActive = false
                    return // Exit the loop if controller is closed
                  }
                } else {
                  logStep('CONTROLLER_INACTIVE_RANGE', {
                    requestId,
                    message: 'Controller is inactive, stopping range stream'
                  })
                  return
                }
              }
              
              logStep('STREAMING_COMPLETE', {
                requestId,
                totalReceived,
                chunkCount,
                duration: Date.now() - downloadStartTime + 'ms',
                totalDuration: Date.now() - requestStartTime + 'ms'
              })
              
              // Only close if controller is still active
              if (isControllerActive) {
                try {
                  isControllerActive = false
                  controller.close()
                } catch (closeError) {
                  logError('CONTROLLER_CLOSE_ERROR', closeError, {
                    requestId,
                    message: 'Controller may already be closed'
                  })
                }
              }
            } catch (error) {
              logError('STREAMING_ERROR', error, {
                requestId,
                duration: Date.now() - downloadStartTime + 'ms'
              })
              controller.error(error)
            }
          }
        })

        logStep('RANGE_RESPONSE_SENT', {
          requestId,
          status: 206,
          contentRange: `bytes ${start}-${end}/${fileSize}`,
          contentLength: chunkSize,
          contentType
        })
        
        return new NextResponse(stream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year (video chunks don't change)
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
          },
        })
      } else {
        // For full file downloads, check size limits and implement fallback
        const isPdf = contentType === 'application/pdf'
        const effectiveMemoryLimit = isPdf ? PDF_MEMORY_LIMIT : MEMORY_LIMIT
        
        logStep('FULL_FILE_REQUEST', {
          requestId,
          fileSize,
          fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
          isPdf,
          effectiveMemoryLimit: effectiveMemoryLimit / 1024 / 1024 + 'MB'
        })
        
        if (fileSize > effectiveMemoryLimit) {
          logStep('FILE_TOO_LARGE_FALLBACK', {
            requestId,
            fileSize,
            effectiveMemoryLimit,
            isPdf,
            fallback: 'redirect_to_mega'
          })
          
          // Fallback: redirect to direct MEGA download
          return NextResponse.redirect(attachmentData.url, 302)
        }

        // Stream entire file with memory protection and timeout
        const stream = new ReadableStream({
          async start(controller) {
            try {
              logStep('FULL_FILE_STREAMING_START', {
                requestId
              })
              
              const downloadStream = file.download({})
              let totalReceived = 0
              let chunkCount = 0
              const streamStartTime = Date.now()
              
              // Set streaming timeout based on file type with controller state tracking
              const effectiveTimeout = isPdf ? PDF_STREAMING_TIMEOUT : STREAMING_TIMEOUT
              let isControllerActive = true
              
              const timeoutId = setTimeout(() => {
                if (isControllerActive) {
                  logError('STREAMING_TIMEOUT', new Error(`Streaming timeout after ${effectiveTimeout / 1000}s`), {
                    requestId,
                    totalReceived,
                    duration: Date.now() - streamStartTime,
                    isPdf,
                    effectiveTimeout
                  })
                  isControllerActive = false
                  controller.error(new Error('Streaming timeout'))
                }
              }, effectiveTimeout)
              
              logStep('TIMEOUT_SET', {
                requestId,
                isPdf,
                effectiveTimeout: effectiveTimeout / 1000 + 's'
              })
              
              try {
                for await (const chunk of downloadStream) {
                  const buffer = Buffer.from(chunk)
                  totalReceived += buffer.length
                  chunkCount++
                  
                  // Log progress every 1MB
                  if (totalReceived % (1024 * 1024) < buffer.length) {
                    logStep('FULL_FILE_PROGRESS', {
                      requestId,
                      totalReceived,
                      receivedMB: (totalReceived / 1024 / 1024).toFixed(2),
                      chunkCount,
                      duration: Date.now() - streamStartTime + 'ms'
                    })
                  }
                  
                  if (totalReceived > effectiveMemoryLimit) {
                    clearTimeout(timeoutId)
                    logError('FULL_FILE_MEMORY_LIMIT', new Error('File too large for streaming'), {
                      requestId,
                      totalReceived,
                      effectiveMemoryLimit,
                      isPdf
                    })
                    isControllerActive = false
                    controller.error(new Error('File too large for streaming'))
                    return
                  }
                  
                  // Only enqueue if controller is still active
                  if (isControllerActive) {
                    try {
                      controller.enqueue(buffer)
                    } catch (enqueueError) {
                      logError('ENQUEUE_ERROR_FULL_FILE', enqueueError, {
                        requestId,
                        message: 'Controller may be closed during full file streaming'
                      })
                      isControllerActive = false
                      return // Exit if controller is closed
                    }
                  } else {
                    logStep('CONTROLLER_INACTIVE', {
                      requestId,
                      message: 'Controller is inactive, stopping enqueue'
                    })
                    return // Exit if controller is inactive
                  }
                }
                
                clearTimeout(timeoutId)
                logStep('FULL_FILE_STREAMING_COMPLETE', {
                  requestId,
                  totalReceived,
                  chunkCount,
                  duration: Date.now() - streamStartTime + 'ms'
                })
                
                // Only close if controller is still active
                if (isControllerActive) {
                  try {
                    isControllerActive = false
                    controller.close()
                  } catch (closeError) {
                    logError('CONTROLLER_CLOSE_ERROR_FULL_FILE', closeError, {
                      requestId,
                      message: 'Controller may already be closed during full file streaming'
                    })
                  }
                }
              } catch (streamError) {
                clearTimeout(timeoutId)
                throw streamError
              }
            } catch (error) {
              logError('FULL_FILE_STREAMING_ERROR', error, {
                requestId
              })
              controller.error(error)
            }
          }
        })

        logStep('FULL_FILE_RESPONSE_SENT', {
          requestId,
          status: 200,
          contentLength: fileSize,
          contentType
        })
        
        return new NextResponse(stream, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
          },
        })
      }
    } catch (megaError) {
      logError('MEGA_STREAMING_ERROR', megaError, {
        requestId,
        totalDuration: Date.now() - requestStartTime + 'ms'
      })
      
      // Fallback: redirect to direct MEGA download on any streaming error
      logStep('FALLBACK_REDIRECT', {
        requestId,
        reason: 'mega_streaming_error',
        fallbackUrl: attachmentData.url
      })
      
      return NextResponse.redirect(attachmentData.url, 302)
    }
  } catch (error) {
    logError('GENERAL_STREAMING_ERROR', error, {
      requestId,
      totalDuration: Date.now() - requestStartTime + 'ms'
    })
    
    // Fallback: redirect to direct MEGA download on any error
    if (attachmentData?.url) {
      logStep('FALLBACK_REDIRECT', {
        requestId,
        reason: 'general_error',
        fallbackUrl: attachmentData.url,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return NextResponse.redirect(attachmentData.url, 302)
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream failed' },
      { status: 500 }
    )
  }
}
