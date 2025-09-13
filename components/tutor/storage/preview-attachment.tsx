'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogDescription, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DocumentPreview } from '@/components/ui/document-preview'
import { toast } from 'sonner'

interface PreviewAttachmentProps {
  url: string
  onClose: () => void
  attachmentId?: number
  fileType?: 'pdf' | 'video' | 'image' | 'office' | 'text' | 'other'
}

export function PreviewAttachment({ url, onClose, attachmentId, fileType }: PreviewAttachmentProps) {
  const t = useTranslations('StorageDialog')

  const handleDownload = () => {
    try {
      // Open the MEGA URL in a new tab for download
      window.open(url, '_blank')
      toast.success(t('download_started'))
    } catch (error) {
      toast.error(t('download_failed'))
    }
  }


  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('file_preview')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('file_preview_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-8rem)]">
          <DocumentPreview
            url={url}
            attachmentId={attachmentId}
            fileType={fileType}
            onDownload={handleDownload}
            showControls={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
