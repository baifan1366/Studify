'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Image as ImageIcon, Play, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Clock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import VideoPlayer from '@/components/ui/video-player'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import ReactMarkdown from 'react-markdown'
import { useTranslations } from 'next-intl'
import { useAsyncDocumentPreview } from '@/hooks/document/use-async-document-preview'

// Set up PDF.js worker with version matching
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export type FileType = 'pdf' | 'image' | 'video' | 'office' | 'text' | 'other'

interface DocumentPreviewProps {
  url: string
  fileType?: FileType
  attachmentId?: number
  onDownload?: () => void
  className?: string
  showControls?: boolean
  enableAsyncProcessing?: boolean // New prop to enable QStash processing
}

interface CloudinaryData {
  hls_url?: string
  fallback_url?: string
  cached?: boolean
}

export function DocumentPreview({ 
  url, 
  fileType: providedFileType, 
  attachmentId, 
  onDownload,
  className = '',
  showControls = true,
  enableAsyncProcessing = false
}: DocumentPreviewProps) {
  const t = useTranslations('DocumentPreview')
  const [fileType, setFileType] = useState<FileType>(providedFileType || 'other')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Async document processing (prioritize QStash for MEGA files)
  const shouldUseAsyncProcessing = enableAsyncProcessing && 
    attachmentId && 
    ['pdf', 'text', 'office'].includes(fileType) &&
    (url.includes('mega.nz') || url.includes('mega.co.nz'))
    
  const asyncProcessing = useAsyncDocumentPreview(
    shouldUseAsyncProcessing ? attachmentId : null,
    fileType as 'pdf' | 'text' | 'office'
  )
  
  // Video streaming state
  const [cloudinaryData, setCloudinaryData] = useState<CloudinaryData | null>(null)
  const [processingVideo, setProcessingVideo] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number>(0)
  const [processingStartTime, setProcessingStartTime] = useState<number>(0)
  
  // PDF-specific state
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  
  // Text content state
  const [textContent, setTextContent] = useState<string>('')
  
  // Enhanced error handling and loading state
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [corsError, setCorsError] = useState<boolean>(false)
  const [fileSize, setFileSize] = useState<number>(0)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  
  const MAX_RETRIES = 3
  const LOADING_TIMEOUT_DEFAULT = 30000 // 30 seconds
  const LOADING_TIMEOUT_PDF = 90000 // 90 seconds for PDFs
  const LOADING_TIMEOUT_OFFICE = 120000 // 2 minutes for Office docs
  const MAX_FILE_SIZE_MB = 100 // Increased from 50MB
  const MAX_FILE_SIZE_PDF_MB = 200 // Higher limit for PDFs

  // Detect file type from URL
  const detectFileType = (url: string): FileType => {
    const urlLower = url.toLowerCase()
    
    // Check file extensions first (more specific than domain)
    
    // PDF files
    if (urlLower.includes('.pdf')) {
      return 'pdf'
    }
    
    // Office documents
    if (urlLower.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|$)/)) {
      return 'office'
    }
    
    // Text files
    if (urlLower.match(/\.(txt|md|json|xml|csv|log|rtf)(\?|$)/)) {
      return 'text'
    }
    
    // Image files
    if (urlLower.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/)) {
      return 'image'
    }
    
    // Video files (check extensions first, then MEGA domains as fallback)
    if (urlLower.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v)(\?|$)/)) {
      return 'video'
    }
    
    // MEGA domains as fallback for video (only if no other extension matched)
    if (urlLower.includes('mega.nz') || urlLower.includes('mega.co.nz')) {
      return 'video'
    }
    
    return 'other'
  }

  useEffect(() => {    
    // Reset states when URL changes
    setError(null)
    setRetryCount(0)
    setCorsError(false)
    setLoadingProgress(0)
    
    // Prioritize provided file type over URL detection
    const detectedType = providedFileType || detectFileType(url)
    setFileType(detectedType)
    
    // MEGA files ALWAYS use QStash processing (skip traditional loading)
    if (shouldUseAsyncProcessing) {
      setIsLoading(false)
      console.log('🚀 MEGA document detected - using QStash processing directly:', { 
        attachmentId, 
        fileType: detectedType, 
        url: url.substring(0, 50) + '...' 
      })
      
      // Immediately start QStash processing - no fallback to traditional loading
      if (!asyncProcessing.isProcessing && !asyncProcessing.isCompleted && !asyncProcessing.isFailed) {
        setTimeout(() => {
          console.log('📤 Sending to QStash queue:', { attachmentId, priority: 'normal' })
          asyncProcessing.startProcessing('normal')
        }, 100) // Minimal delay for hook initialization
      }
      return // Skip all traditional loading
    }
    
    // Handle different file types with traditional loading
    if (detectedType === 'pdf') {
      validateAndLoadPdf(url)
    } else if (detectedType === 'text') {
      loadTextContent(url)
    } else {
      setIsLoading(false)
    }
  }, [url, providedFileType, shouldUseAsyncProcessing])

  // Helper function to check if URL is a blob URL
  const isBlobUrl = (url: string): boolean => {
    return url.startsWith('blob:')
  }

  // Validate PDF file size before loading
  const validatePdfSize = async (url: string): Promise<boolean> => {
    
    try {
      setIsValidating(true)
      
      // Skip validation for blob URLs - they're already loaded in memory
      if (isBlobUrl(url)) {
        console.log('📄 PDF Validation: Skipping validation for blob URL')
        return true
      }
      
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors'
      })
      
      if (!response.ok) {
        console.error('❌ PDF Validation: HEAD request failed', { 
          status: response.status, 
          statusText: response.statusText,
          type: response.type 
        })
        
        if (response.status === 0 || response.type === 'opaque') {
          console.error('🚫 PDF Validation: CORS error detected')
          setCorsError(true)
          throw new Error('CORS policy blocks access to this PDF')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength)
        const sizeInMB = sizeInBytes / (1024 * 1024)
        
        setFileSize(sizeInBytes)
        
        if (sizeInMB > MAX_FILE_SIZE_PDF_MB) {
          console.error('🚫 PDF Validation: File too large', { sizeInMB, maxAllowed: MAX_FILE_SIZE_PDF_MB })
          throw new Error(`PDF file too large (${sizeInMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_PDF_MB}MB.`)
        }
        
        // Warn for large files
        if (sizeInMB > 50) {
          console.warn('⚠️ PDF Validation: Large file detected, may take longer to load', { sizeInMB })
        }
      } else {
        console.warn('⚠️ PDF Validation: No content-length header found, cannot determine file size')
      }
      
      return true
    } catch (error) {
      console.error('❌ PDF Validation: Validation failed', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to validate PDF file')
      }
      return false
    } finally {
      setIsValidating(false)
    }
  }
  
  // Enhanced PDF loading with validation and timeout
  const validateAndLoadPdf = async (url: string) => {
    
    setIsLoading(true)
    
    // For MEGA attachments with attachmentId, use streaming API
    if (attachmentId && (url.includes('mega.nz') || url.includes('mega.co.nz'))) {
      
      const streamingUrl = `/api/attachments/${attachmentId}/stream`
      
      // Set extended timeout for PDF streaming with QStash fallback
      const timeout = setTimeout(() => {
        if (isLoading) {
          console.error('⏰ PDF Loading: Streaming timeout reached', { timeoutMs: LOADING_TIMEOUT_PDF })
          console.log('🔄 Auto-switching to QStash processing due to timeout...')
          
          // Switch to async processing if available
          if (attachmentId && ['pdf', 'text', 'office'].includes(fileType)) {
            setIsLoading(false)
            // Trigger QStash processing as fallback
            if (asyncProcessing.startProcessing) {
              asyncProcessing.startProcessing('high') // High priority for timeout fallback
            }
          } else {
            setError(`PDF loading timeout after ${LOADING_TIMEOUT_PDF / 1000} seconds. Switching to async processing...`)
            setIsLoading(false)
          }
        }
      }, LOADING_TIMEOUT_PDF)
      
      setLoadingTimeout(timeout)
      return // Let react-pdf handle the streaming URL
    }
    
    // For direct URLs, validate file size first
    const isValid = await validatePdfSize(url)
    if (!isValid) {
      console.error('❌ PDF Loading: File validation failed, aborting load')
      setIsLoading(false)
      return
    }
        
    // Set loading timeout based on file size
    const timeoutDuration = fileSize > 50 * 1024 * 1024 ? LOADING_TIMEOUT_PDF : LOADING_TIMEOUT_DEFAULT
    
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.error('⏰ PDF Loading: Direct URL timeout reached', { timeoutDuration })
        console.log('🔄 Auto-switching to QStash processing due to timeout...')
        
        // Switch to async processing if available  
        if (attachmentId && ['pdf', 'text', 'office'].includes(fileType)) {
          setIsLoading(false)
          // Trigger QStash processing as fallback
          if (asyncProcessing.startProcessing) {
            asyncProcessing.startProcessing('high') // High priority for timeout fallback
          }
        } else {
          setError(`PDF loading timeout after ${timeoutDuration / 1000} seconds. File may be too large or connection too slow.`)
          setIsLoading(false)
        }
      }
    }, timeoutDuration)
    
    setLoadingTimeout(timeout)
  }
  
  // Enhanced text content loading with file size validation
  const loadTextContent = async (url: string, attempt: number = 0) => {
    try {
      setProcessingStage('Validating text file...')
      
      // Skip size validation for blob URLs - they're already loaded in memory
      if (!isBlobUrl(url)) {
        // First, check file size with HEAD request for non-blob URLs
        const headResponse = await fetch(url, { method: 'HEAD', mode: 'cors' })
        if (headResponse.ok) {
          const contentLength = headResponse.headers.get('content-length')
          if (contentLength) {
            const sizeInBytes = parseInt(contentLength)
            const sizeInMB = sizeInBytes / (1024 * 1024)
            setFileSize(sizeInBytes)
            
            if (sizeInMB > MAX_FILE_SIZE_MB) {
              throw new Error(`Text file too large (${sizeInMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
            }
            
            if (sizeInMB > 10) {
              setProcessingStage(`Large text file detected (${sizeInMB.toFixed(1)}MB). Loading may take longer...`)
            }
          }
        }
      }
      
      setProcessingStage('Loading text content...')
      // Use different fetch options for blob URLs vs regular URLs
      const fetchOptions = isBlobUrl(url) ? {} : { mode: 'cors' as RequestMode }
      const response = await fetch(url, fetchOptions)
      
      if (!response.ok) {
        if (response.status === 0 || response.type === 'opaque') {
          setCorsError(true)
          throw new Error('CORS policy blocks access to this file')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const text = await response.text()
      setTextContent(text)
      setIsLoading(false)
      setRetryCount(0)
      setProcessingStage('')
    } catch (error) {
      console.error('Error loading text content:', error)
      
      if (attempt < MAX_RETRIES && !corsError) {
        setRetryCount(attempt + 1)
        setProcessingStage(`Loading failed. Retrying... (${attempt + 1}/${MAX_RETRIES})`)
        setTimeout(() => {
          loadTextContent(url, attempt + 1)
        }, 2000 * (attempt + 1)) // Exponential backoff
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load text content')
        setIsLoading(false)
        setProcessingStage('')
      }
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      try {
        window.open(url, '_blank')
        toast.success('Download started')
      } catch (error) {
        toast.error('Download failed')
      }
    }
  }

  const handleImageError = () => {
    setError('Failed to load image')
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  // Calculate exponential backoff delay
  const getRetryDelay = (attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30 seconds
  }

  // Fetch Cloudinary HLS URL for video files with retry logic
  const fetchCloudinaryUrl = async (attachmentId: number, attempt: number = 0) => {
    if (!attachmentId || attachmentId === undefined) {
      console.error('❌ Invalid attachment ID:', attachmentId)
      setError('Invalid attachment ID')
      return
    }
    
    setProcessingVideo(true)
    setRetryCount(attempt)
    
    if (attempt === 0) {
      setProcessingStartTime(Date.now())
      setEstimatedTime(60) // Default estimate
    }
    
    try {
      setProcessingStage(attempt === 0 ? 'Initializing video processing...' : `Retrying... (attempt ${attempt + 1})`)
      
      const apiUrl = `/api/video/preview?attachmentId=${attachmentId}`
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '3600', 10)
        throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`)
      }
      
      // Handle processing in progress
      if (response.status === 202 && data.processing) {
        setProcessingStage('Video is being processed by another request...')
        const retryAfter = parseInt(response.headers.get('retry-after') || '300', 10)
        
        if (attempt < 3) {
          const delay = Math.max(retryAfter * 1000, getRetryDelay(attempt))
          setRetryTimeout(setTimeout(() => {
            fetchCloudinaryUrl(attachmentId, attempt + 1)
          }, delay))
          return
        } else {
          throw new Error('Video processing is taking longer than expected. Please try again later.')
        }
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video')
      }
      
      setProcessingStage('Processing completed successfully!')
      const newCloudinaryData = {
        hls_url: data.hls_url,
        fallback_url: data.fallback_url,
        cached: data.cached,
      }
      setCloudinaryData(newCloudinaryData)
      
      // Stop processing since we got the data successfully
      setProcessingVideo(false)
      setProcessingStage('')
      
    } catch (error) {
      console.error('❌ Cloudinary processing failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Video processing failed'
      
      // Implement retry logic with exponential backoff
      if (attempt < 3 && !errorMessage.includes('Rate limit') && !errorMessage.includes('Access denied')) {
        const delay = getRetryDelay(attempt)
        setProcessingStage(`Processing failed. Retrying in ${Math.ceil(delay / 1000)} seconds...`)
        
        setRetryTimeout(setTimeout(() => {
          fetchCloudinaryUrl(attachmentId, attempt + 1)
        }, delay))
        return
      }
      
      // Final fallback: show error
      if (attempt >= 3) {
        setProcessingStage('Video processing failed after multiple attempts')
        setError('Video processing failed. Please try downloading the file directly.')
      } else {
        setError(errorMessage)
      }
    } finally {
      if (attempt >= 3 || cloudinaryData) {
        setProcessingVideo(false)
        setProcessingStage('')
      }
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, [retryTimeout, loadingTimeout])

  // Enhanced PDF event handlers with retry logic
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    
    setNumPages(numPages)
    setIsLoading(false)
    setRetryCount(0)
    setLoadingProgress(100)
    
    // Clear loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
      setLoadingTimeout(null)
    }
  }
  
  const onDocumentLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    if (total > 0) {
      const progress = (loaded / total) * 100
      setLoadingProgress(progress)
    }
  }
  
  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF Error: Document load failed', { 
      error: error.message, 
      errorName: error.name,
      stack: error.stack,
      url: attachmentId ? `/api/attachments/${attachmentId}/stream` : url,
      attachmentId,
      retryCount
    })
    
    // Clear loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
      setLoadingTimeout(null)
    }
    
    // Check for CORS errors
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      setCorsError(true)
      setError('CORS policy blocks access to this PDF. The file may need to be served from the same domain.')
      setIsLoading(false)
      return
    }
    
    // Implement retry logic for network errors
    if (retryCount < MAX_RETRIES && 
        (error.message.includes('network') || 
         error.message.includes('fetch') ||
         error.message.includes('timeout') ||
         error.name === 'NetworkError')) {
      
      setRetryCount(prev => prev + 1)
      setError(`Network error. Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
      
      // Retry with exponential backoff
      setTimeout(() => {
        setError(null)
        setIsLoading(true)
        validateAndLoadPdf(url)
      }, 2000 * (retryCount + 1))
      
      return
    }
    
    // If all retries failed or it's not a network error, show enhanced fallback options
    if (retryCount >= MAX_RETRIES) {
      setError(`Failed to load PDF after ${MAX_RETRIES} attempts. The file may be too large or corrupted.`)
    } else {
      // Try to detect if it's actually a different file type
      const fallbackType = detectFileType(url)
      if (fallbackType !== 'pdf') {
        setFileType(fallbackType)
        setError(null)
      } else {
        // Enhanced error message with suggestions
        const sizeInfo = fileSize > 0 ? ` (${(fileSize / 1024 / 1024).toFixed(1)}MB)` : ''
        setError(`Failed to load PDF${sizeInfo}: ${error.message}`)
      }
    }
    
    setIsLoading(false)
  }
  
  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }
  
  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }
  
  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2))
  }
  
  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2))
  }

  // Get Office Online embed URL
  const getOfficeEmbedUrl = (url: string): string => {
    // Microsoft Office Online viewer
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
  }

  // Check if it's a video file
  const isVideoFile = (url: string): boolean => {
    return detectFileType(url) === 'video'
  }

  // Render video content with Cloudinary HLS streaming
  const renderVideoContent = () => {
    // If we have an attachment ID and it's a video file, use the streaming API
    if (attachmentId && isVideoFile(url)) {
      // If we don't have Cloudinary data yet, fetch it
      if (!cloudinaryData && !processingVideo) {
        fetchCloudinaryUrl(attachmentId)
        return (
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-center text-white space-y-4 max-w-md">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto"></div>
              <div className="space-y-3">
                <p className="text-lg font-medium">{t('processing_video')}</p>
                {processingStage && (
                  <p className="text-sm opacity-90 font-medium">{processingStage}</p>
                )}
                {estimatedTime > 0 && processingStartTime > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs opacity-70">
                      {t('estimated_time')}: {Math.ceil(estimatedTime / 60)} {t('minutes')}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((Date.now() - processingStartTime) / (estimatedTime * 1000)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                {retryCount > 0 && (
                  <p className="text-xs opacity-70">{t('retry_attempt')}: {retryCount + 1}/{t('max_retries')}</p>
                )}
                <p className="text-xs opacity-60">{t('large_files')}: {t('several_minutes')}</p>
              </div>
            </div>
          </div>
        )
      }
      
      // Show processing state
      if (processingVideo) {
        return (
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-center text-white space-y-4 max-w-md">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto"></div>
              <div className="space-y-3">
                <p className="text-lg font-medium">{t('processing_video')}</p>
                {processingStage && (
                  <p className="text-sm opacity-90 font-medium">{processingStage}</p>
                )}
                {estimatedTime > 0 && processingStartTime > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs opacity-70">
                      {t('estimated_time')}: {Math.ceil(estimatedTime / 60)} {t('minutes')}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((Date.now() - processingStartTime) / (estimatedTime * 1000)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                {retryCount > 0 && (
                  <p className="text-xs opacity-70">{t('retry_attempt')}: {retryCount + 1}/{t('max_retries')}</p>
                )}
                <p className="text-xs opacity-60">{t('converting_to_hls_streaming_format')}</p>
              </div>
            </div>
          </div>
        )
      }
      
      // Use Cloudinary HLS streaming if available
      if (cloudinaryData?.hls_url) {
        return (
          <div className="space-y-4">
            {showControls && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                  <Play className="h-4 w-4" />
                  {t('video_file')}
                </Badge>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download')}
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <VideoPlayer
                hlsSrc={cloudinaryData.hls_url}
                src={cloudinaryData.fallback_url}
                className="aspect-video"
                onError={(error) => {
                  console.error('🎬 VideoPlayer error:', error)
                  setError(`VideoPlayer error: ${error}`)
                }}
                onLoadStart={() => {
                  if (!cloudinaryData?.hls_url) {
                    setIsLoading(true)
                  }
                }}
                onCanPlay={() => {
                  setIsLoading(false)
                }}
              />
              {cloudinaryData.cached && (
                <div className="text-xs text-muted-foreground text-center">
                  ✓ {t('using_cached_hls_stream')}
                </div>
              )}
              {!cloudinaryData.cached && processingStartTime > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  ✓ {t('processed_in')} {Math.ceil((Date.now() - processingStartTime) / 1000)} {t('seconds')}
                </div>
              )}
            </div>
          </div>
        )
      }
    }

    // Fallback for videos without attachment ID or processing failed
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Play className="h-16 w-16 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('video_preview')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('video_streaming_not_available')}
          </p>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4 mr-2" />
              {t('download')}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(url, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('open_link')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render async processing state
  if (shouldUseAsyncProcessing && !asyncProcessing.isCompleted) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4 max-w-md">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            {asyncProcessing.progress > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {Math.round(asyncProcessing.progress)}%
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">
              {asyncProcessing.isProcessing ? 'Processing Document' : 'Document Processing'}
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {asyncProcessing.stage}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${asyncProcessing.progress}%` }}
              />
            </div>
            
            {/* Time Remaining */}
            {asyncProcessing.estimatedTimeRemaining > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Est. {Math.ceil(asyncProcessing.estimatedTimeRemaining / 60)} min remaining
                </span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              {!asyncProcessing.isProcessing && !asyncProcessing.isQueueing && (
                <Button 
                  onClick={() => asyncProcessing.startProcessing('normal')}
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Start Processing
                </Button>
              )}
              
              <Button 
                onClick={handleDownload} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Instead
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Handle async processing failure
  if (shouldUseAsyncProcessing && asyncProcessing.isFailed) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <FileText className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-destructive font-medium">Processing Failed</p>
            <p className="text-sm text-muted-foreground">
              {asyncProcessing.error || 'Document processing failed'}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => asyncProcessing.startProcessing('high')} 
              variant="default" 
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Processing
            </Button>
            <Button 
              onClick={handleDownload} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download File
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  // Use processed result if available
  const effectiveUrl = (shouldUseAsyncProcessing && asyncProcessing.result?.previewUrl) 
    ? asyncProcessing.result.previewUrl 
    : url

  if ((isLoading || isValidating) && fileType !== 'video') {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {isValidating ? t('validating_file') : processingStage || t('loading_preview')}
            </p>
            {fileSize > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('file_size')}: {(fileSize / (1024 * 1024)).toFixed(1)}MB
              </p>
            )}
            {fileType === 'pdf' && loadingProgress > 0 && (
              <div className="w-48 mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(loadingProgress)}% {t('loaded')}
                </p>
              </div>
            )}
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('retry_attempt')} {retryCount}/{MAX_RETRIES}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <FileText className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-destructive font-medium">{error}</p>
            {fileSize > 50 * 1024 * 1024 && (
              <div className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded-lg space-y-1">
                <p className="font-medium">⚠️ {t('large_file_detected')}</p>
                <p>{t('files_over_50mb_may_have_loading_issues')}. {t('consider')}</p>
                <ul className="text-left space-y-1 mt-2">
                  <li>• {t('downloading_file_for_local_viewing')}</li>
                  <li>• {t('using_smaller_file_if_available')}</li>
                  <li>• {t('checking_internet_connection_speed')}</li>
                </ul>
              </div>
            )}
            {corsError && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>💡 {t('possible_solutions')}:</p>
                <ul className="text-left max-w-md mx-auto space-y-1">
                  <li>• {t('downloading_file_for_local_viewing')}</li>
                  <li>• {t('ask_file_owner_to_enable_cors')}</li>
                  <li>• {t('use_proxy_service_for_external_files')}</li>
                </ul>
              </div>
            )}
            {retryCount >= MAX_RETRIES && (
              <p className="text-xs text-muted-foreground">
                {t('all_retry_attempts_failed')}. {t('please_check_internet_connection')}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('download_file')}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(url, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('open_direct_link')}
            </Button>
            {retryCount > 0 && retryCount < MAX_RETRIES && (
              <Button 
                onClick={() => {
                  setError(null)
                  setRetryCount(0)
                  setCorsError(false)
                  setProcessingStage('')
                  if (fileType === 'pdf') {
                    validateAndLoadPdf(url)
                  } else if (fileType === 'text') {
                    loadTextContent(url)
                  }
                }}
                variant="default"
              >
                {t('retry_loading')}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const content = (() => {
    switch (fileType) {
      case 'video':
        return renderVideoContent()

      case 'pdf':
        return (
          <div className="space-y-4">
            {showControls && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                  {t('pdf_document')}
                </Badge>
                <div className="flex items-center gap-2">
                  {numPages > 0 && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {pageNumber} / {numPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(scale * 100)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('download')}
                  </Button>
                </div>
              </div>
            )}
            <div className="border border-border rounded-lg overflow-auto max-h-[600px] bg-gray-50 flex justify-center">
              <Document
                file={(() => {
                  // Use async processed URL if available, otherwise use streaming endpoint for MEGA files
                  if (shouldUseAsyncProcessing && asyncProcessing.result?.previewUrl) {
                    return asyncProcessing.result.previewUrl
                  }
                  
                  const pdfUrl = attachmentId && (url.includes('mega.nz') || url.includes('mega.co.nz')) 
                    ? `/api/attachments/${attachmentId}/stream` 
                    : url
                  return pdfUrl
                })()}
                onLoadSuccess={(data) => {
                  onDocumentLoadSuccess(data)
                }}
                onLoadError={(error) => {
                  onDocumentLoadError(error)
                }}
                onLoadProgress={(data) => {
                  onDocumentLoadProgress(data)
                }}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <span className="text-sm text-muted-foreground">
                        {t('loading_pdf')}
                      </span>
                      {loadingProgress > 0 && (
                        <div className="w-32 mx-auto">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-primary h-1 rounded-full transition-all duration-300"
                              style={{ width: `${loadingProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                }
                options={{
                  cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                  cMapPacked: true,
                  standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
                }}
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale}
                  loading={
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  }
                />
              </Document>
            </div>
          </div>
        )

      case 'office':
        return (
          <div className="space-y-4">
            {showControls && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                  {t('office_document')}
                </Badge>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download')}
                </Button>
              </div>
            )}
            <div className="border border-border rounded-lg overflow-hidden">
              <iframe
                src={getOfficeEmbedUrl(url)}
                className="w-full h-[600px] bg-background"
                title="Office Document Preview"
                onLoad={() => {
                  setIsLoading(false)
                  setProcessingStage('')
                }}
                onError={() => {
                  setError('Failed to load Office document. The file may be too large or the format may not be supported by Office Online.')
                  setIsLoading(false)
                  setProcessingStage('')
                }}
              />
              {isLoading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">
                      {processingStage || 'Loading Office document...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('large_documents_may_take_up_to_2_minutes_to_load')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="space-y-4">
            {showControls && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                  {t('text_file')}
                </Badge>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download')}
                </Button>
              </div>
            )}
            <div className="border border-border rounded-lg p-4 max-h-[600px] overflow-auto bg-background">
              {url.toLowerCase().includes('.md') ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{textContent}</ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
                  {textContent}
                </pre>
              )}
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            {showControls && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                  <ImageIcon className="h-4 w-4" />
                  {t('image_file')}
                </Badge>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download')}
                </Button>
              </div>
            )}
            <div className="flex justify-center border border-border rounded-lg p-4 bg-gray-50">
              <img
                src={url}
                alt="Preview"
                className="max-w-full max-h-[600px] object-contain rounded-lg"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">{t('preview_not_available')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('this_file_type_is_not_supported_for_preview_you_can_download_it_to_view')}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleDownload} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('open_link')}
                </Button>
              </div>
            </div>
          </div>
        )
    }
  })()

  return <div className={className}>{content}</div>
}
