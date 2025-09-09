'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PreviewAttachment } from './preview-attachment'
import { useAttachments } from '@/hooks/course/use-attachments'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { formatFileSize } from '@/lib/validations/attachment'

interface AttachmentListProps {
  refreshTrigger?: number
  ownerId?: number
}

export function AttachmentList({ refreshTrigger, ownerId }: AttachmentListProps) {
  const t = useTranslations('StorageDialog')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Use the new hook for fetching attachments
  const { data: attachments = [], isLoading, refetch } = useAttachments(ownerId)

  const formatFileSizeWithFallback = (bytes: number | null) => {
    if (!bytes || bytes === 0) return t('unknown_size') || 'Unknown size'
    return formatFileSize(bytes)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePreview = (url: string | null) => {
    if (!url) {
      toast.error(t('preview_not_available'))
      return
    }
    setPreviewUrl(url)
  }

  const closePreview = () => {
    setPreviewUrl(null)
  }

  if (isLoading) {
    return (
      <Card className="w-full bg-card text-card-foreground border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          {t('loading_attachments') || 'Loading attachments...'}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full bg-card text-card-foreground border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                {t('attachments_title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('attachments_count', { 
                  count: attachments.length, 
                  plural: attachments.length !== 1 ? 's' : '' 
                })}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-border hover:bg-accent hover:text-accent-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('no_attachments')}</p>
              <p className="text-sm">{t('no_attachments_description')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-foreground">{attachment.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                        {formatFileSizeWithFallback(attachment.size)}
                      </Badge>
                      <span>{formatDate(attachment.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(attachment.url)}
                      disabled={!attachment.url}
                      className="border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('preview')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewUrl && (
        <PreviewAttachment url={previewUrl} onClose={closePreview} />
      )}
    </>
  )
}
