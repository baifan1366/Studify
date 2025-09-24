'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, ExternalLink, AlertCircle, Copy } from 'lucide-react'
import { PdfRenderer } from '@/components/ui/pdf-renderer'
import { useTranslations } from 'next-intl'

export type FileType = 'pdf' | 'image' | 'video' | 'office' | 'text' | 'other'

interface DocumentPreviewProps {
  fileId: string
  className?: string
  showControls?: boolean
  onDownload?: () => void
}

interface ApiResponse {
  // For small files (binary response)
  blob?: Blob
  mode?: 'blob'
  // For large files (JSON response)  
  url?: string
  name?: string
  size?: number
  mimeType?: string
}

export function DocumentPreview({ 
  fileId,
  className = '',
  showControls = true,
  onDownload
}: DocumentPreviewProps) {
  const t = useTranslations('DocumentPreview')
  
  // Simplified state - only what we actually need
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  // Fetch file data from API
  useEffect(() => {
    let isActive = true
    
    const fetchFile = async () => {
      try {
        setLoading(true)
        setError(null)
        setIsRetrying(retryCount > 0)
                
        const apiResponse = await fetch(`/api/preview/${fileId}`)
        
        // Check if component is still mounted
        if (!isActive) return
        
        // Check if response is ok
        if (!apiResponse.ok) {
          throw new Error(`API response error: ${apiResponse.status} ${apiResponse.statusText}`)
        }
        
        // Check response headers to determine mode
        const previewMode = apiResponse.headers.get('X-Preview-Mode')
        
        if (previewMode === 'blob') {
          // Small file - binary response
          const blob = await apiResponse.blob()
          const fileName = apiResponse.headers.get('X-File-Name') || 'Document'
          const fileSize = parseInt(apiResponse.headers.get('X-File-Size') || '0')
          const mimeType = apiResponse.headers.get('Content-Type') || 'application/pdf'
          
          // Create blob URL for rendering
          const url = URL.createObjectURL(blob)
          setBlobUrl(url)
          
          setResponse({
            blob,
            mode: 'blob'
          })
          
        } else {
          // Large file - JSON response
          const data = await apiResponse.json()
          setResponse(data)
        }
        
      } catch (err) {
        if (!isActive) return // Don't set error if component unmounted
        
        console.error(`❌ Failed to fetch file (attempt ${retryCount + 1}):`, err)
        
        // Handle different error types
        let errorMessage = t('failedToLoadFile')
        if (err instanceof Error) {
          if (err.message.includes('MEGA')) {
            errorMessage = t('megaServiceError', { message: err.message })
          } else if (err.message.includes('timeout')) {
            errorMessage = t('connectionTimeout')
          } else {
            errorMessage = err.message
          }
        }
        
        setError(errorMessage)
      } finally {
        if (isActive) {
          setLoading(false)
          setIsRetrying(false)
        }
      }
    }

    if (fileId) {
      fetchFile()
    }

    // Cleanup function
    return () => {
      isActive = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [fileId, retryCount])


  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (response?.url) {
      // Large file - open MEGA URL in new tab
      window.open(response.url, '_blank')
    } else if (blobUrl && response?.blob) {
      // Small file - download blob directly
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = response?.name || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleCopyLink = async () => {
    if (response?.url) {
      try {
        await navigator.clipboard.writeText(response.url)
        // You can add a toast notification here if available
        console.log('Link copied to clipboard')
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = response.url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        console.log('Link copied to clipboard (fallback)')
      }
    }
  }

  const handleOpenLink = () => {
    if (response?.url) {
      window.open(response.url, '_blank')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {isRetrying ? t('retryingAttempt', { attempt: retryCount + 1 }) : t('loadingPreview')}
          </p>
          {isRetrying && (
            <p className="text-xs text-muted-foreground">
              {t('previousAttemptsFailed')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-destructive font-medium">{t('failedToLoadPreview')}</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          {showControls && (
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => {
                  setRetryCount(prev => prev + 1)
                  setError(null)
                  setResponse(null)
                  setBlobUrl(null)
                }} 
                variant="outline" 
                size="sm"
                disabled={loading || isRetrying}
              >
                {loading || isRetrying ? t('retrying') : t('retry', { count: retryCount > 0 ? retryCount + 1 : 0 })}
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t('download')}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{t('noPreviewAvailable')}</p>
        </div>
      </div>
    )
  }

  // Small file mode - show PDF renderer
  if (response.mode === 'blob' && blobUrl) {
    return (
      <div className={className}>
        <PdfRenderer
          url={blobUrl}
          fileName={response.name}
          fileSize={response.size}
          showControls={showControls}
          onDownload={handleDownload}
        />
      </div>
    )
  }

  // Large file mode - show download options
  if (response.url) {
    const fileSizeMB = response.size ? (response.size / 1024 / 1024).toFixed(1) : '?'
    
    return (
      <div className={`flex flex-col items-center justify-center p-8 border border-border rounded-lg bg-muted/50 ${className}`}>
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <div className="text-center space-y-4 max-w-md">
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {response.name || t('largeDocument')}
            </h3>
            <p className="text-muted-foreground mb-2">
              {t('fileSizeInfo', { size: fileSizeMB })}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('largeFileCannotPreview')}
            </p>
          </div>
          
          {showControls && (
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={handleDownload} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t('openInNewTab')}
              </Button>
              <Button onClick={handleOpenLink} variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t('openLink')}
              </Button>
              <Button onClick={handleCopyLink} variant="outline" className="gap-2">
                <Copy className="h-4 w-4" />
                {t('copyLink')}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div className={`flex items-center justify-center h-96 ${className}`}>
      <div className="text-center space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">{t('unableToDisplayPreview')}</p>
      </div>
    </div>
  )
}
