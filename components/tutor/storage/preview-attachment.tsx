'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Download, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PreviewAttachmentProps {
  url: string
  onClose: () => void
}

export function PreviewAttachment({ url, onClose }: PreviewAttachmentProps) {
  const t = useTranslations('StorageDialog')
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'other'>('other')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Determine file type from URL
    const determineFileType = () => {
      const urlLower = url.toLowerCase()
      
      if (urlLower.includes('.pdf')) {
        setFileType('pdf')
      } else if (urlLower.match(/\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/)) {
        setFileType('image')
      } else {
        setFileType('other')
      }
      
      setIsLoading(false)
    }

    determineFileType()
  }, [url])

  const handleDownload = () => {
    try {
      // Open the MEGA URL in a new tab for download
      window.open(url, '_blank')
      toast.success(t('download_started'))
    } catch (error) {
      toast.error(t('download_failed'))
    }
  }

  const handleImageError = () => {
    setError(t('failed_to_load') + ' image')
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loading_preview')}</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={handleDownload} variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
              <Download className="h-4 w-4 mr-2" />
              {t('download_file')}
            </Button>
          </div>
        </div>
      )
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                <FileText className="h-4 w-4" />
                {t('pdf_document')}
              </Badge>
              <Button onClick={handleDownload} variant="outline" size="sm" className="border-border hover:bg-accent hover:text-accent-foreground">
                <Download className="h-4 w-4 mr-2" />
                {t('download_file')}
              </Button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <iframe
                src={url}
                className="w-full h-[600px] bg-background"
                title="PDF Preview"
                onError={() => setError(t('failed_to_load') + ' PDF')}
              />
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="flex items-center gap-2 bg-secondary text-secondary-foreground">
                <ImageIcon className="h-4 w-4" />
                {t('image_file')}
              </Badge>
              <Button onClick={handleDownload} variant="outline" size="sm" className="border-border hover:bg-accent hover:text-accent-foreground">
                <Download className="h-4 w-4 mr-2" />
                {t('download_file')}
              </Button>
            </div>
            <div className="flex justify-center">
              <img
                src={url}
                alt="Preview"
                className="max-w-full max-h-[600px] object-contain rounded-lg border border-border bg-background"
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
                {t('preview_not_available_desc')}
              </p>
              <Button onClick={handleDownload} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Download className="h-4 w-4 mr-2" />
                {t('download_file')}
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-background text-foreground border-border">
        <DialogHeader>
            <DialogTitle className="text-foreground">{t('file_preview')}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-8rem)]">
          {renderPreviewContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
