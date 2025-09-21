'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, ExternalLink, AlertCircle } from 'lucide-react'
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

  // Fetch file data from API
  useEffect(() => {
    const fetchFile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log(`🔍 Fetching file data for fileId: ${fileId}`)
        
        const apiResponse = await fetch(`/api/preview/${fileId}`)
        
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
          
          console.log(`📄 Small file loaded:`, { fileName, fileSize, mimeType })
        } else {
          // Large file - JSON response
          const data = await apiResponse.json()
          setResponse(data)
          console.log(`📄 Large file info:`, data)
        }
        
      } catch (err) {
        console.error('❌ Failed to fetch file:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setLoading(false)
      }
    }

    if (fileId) {
      fetchFile()
    }

    // Cleanup blob URL when component unmounts or fileId changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [fileId, retryCount])

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (response?.url) {
      // Large file - open MEGA URL
      window.open(response.url, '_blank')
    } else if (blobUrl && response?.blob) {
      // Small file - download blob
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = response?.name || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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
          <p className="text-muted-foreground">Loading preview...</p>
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
            <p className="text-destructive font-medium">Failed to load preview</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          {showControls && (
            <div className="flex gap-2 justify-center">
              <Button onClick={() => {
                setRetryCount(prev => prev + 1)
                setError(null)
                setResponse(null)
                setBlobUrl(null)
              }} variant="outline" size="sm">
                Retry {retryCount > 0 && `(${retryCount + 1})`}
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
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
          <p className="text-muted-foreground">No preview available</p>
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
              {response.name || 'Large Document'}
            </h3>
            <p className="text-muted-foreground mb-2">
              File size: {fileSizeMB}MB (too large for preview)
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Files larger than 50MB cannot be previewed directly
            </p>
          </div>
          
          {showControls && (
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
              <Button onClick={handleOpenLink} variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Link
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
        <p className="text-muted-foreground">Unable to display preview</p>
      </div>
    </div>
  )
}
