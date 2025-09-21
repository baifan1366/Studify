'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogDescription, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MegaDocumentPreview from '@/components/attachment/mega-document-preview'
import { toast } from 'sonner'

interface PreviewAttachmentProps {
  attachmentId: number
  onClose: () => void
}

export function PreviewAttachment({ attachmentId, onClose }: PreviewAttachmentProps) {
  const t = useTranslations('StorageDialog')


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
          <MegaDocumentPreview
            attachmentId={attachmentId || 0}
            className="w-full min-h-[400px]"
            showControls={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
