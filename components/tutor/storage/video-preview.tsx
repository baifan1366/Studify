'use client'

import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import VideoPlayer from '@/components/ui/video-player'

interface VideoPreviewProps {
  attachmentId: number
  title?: string
  onClose: () => void
}

export function VideoPreview({ attachmentId, title, onClose }: VideoPreviewProps) {
  const t = useTranslations('StorageDialog')

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {title || t('video_preview')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('video_preview_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-8rem)]">
          <VideoPlayer
            attachmentId={attachmentId}
            title={title}
            className="w-full min-h-[400px]"
            controls={true}
            autoPlay={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
