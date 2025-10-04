'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogDescription, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MegaImage from '@/components/attachment/mega-blob-image'
import { Loader2 } from 'lucide-react'

interface ImagePreviewProps {
  attachmentUrl: string
  title?: string
  onClose: () => void
}

export function ImagePreview({ attachmentUrl, title, onClose }: ImagePreviewProps) {
  const t = useTranslations('StorageDialog')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {title || t('image_preview')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('image_preview_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-8rem)] flex items-center justify-center">
          <MegaImage
            megaUrl={attachmentUrl}
            alt={title || 'Image preview'}
            className="w-full h-auto object-contain rounded-lg"
            onLoad={() => setIsLoading(false)}
            onError={(error) => {
              setIsLoading(false)
              setHasError(true)
              console.error('Image load error:', error)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
