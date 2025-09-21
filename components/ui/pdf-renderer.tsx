'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, FileText } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfRendererProps {
  url: string // Can be blob URL or regular URL
  fileName?: string
  fileSize?: number
  className?: string
  showControls?: boolean
  onDownload?: () => void
}

export function PdfRenderer({ 
  url, 
  fileName = 'Document', 
  fileSize = 0,
  className = '', 
  showControls = true, 
  onDownload 
}: PdfRendererProps) {
  // PDF state
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setPdfLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PDF event handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfLoading(false)
    setPageNumber(1)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF load error:', error)
    setPdfLoading(false)
    setError(`Failed to load PDF: ${error.message}`)
  }

  const onDocumentLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    if (total > 0) {
      const progress = Math.round((loaded / total) * 100)
    }
  }

  // Navigation functions
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

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800 ${className}`}>
        <FileText className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-red-600 dark:text-red-400 font-medium text-center mb-2">
          Failed to load PDF
        </p>
        <p className="text-red-500 dark:text-red-400 text-sm text-center mb-4">
          {error}
        </p>
        {showControls && onDownload && (
          <Button onClick={onDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with file info and download button */}
      {showControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF Document
            </Badge>
            <span className="text-sm text-muted-foreground">
              {fileName} 
              {fileSize > 0 && ` (${(fileSize / 1024 / 1024).toFixed(1)}MB)`}
            </span>
          </div>
          {onDownload && (
            <Button onClick={onDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg p-4 bg-background">
        {/* PDF Controls */}
        {numPages > 0 && showControls && (
          <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={zoomOut} variant="outline" size="sm">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button onClick={zoomIn} variant="outline" size="sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PDF Document */}
        <div className="flex justify-center">
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={onDocumentLoadProgress}
            loading={
              <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading PDF...</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                </div>
              }
            />
          </Document>
        </div>
      </div>
    </div>
  )
}
