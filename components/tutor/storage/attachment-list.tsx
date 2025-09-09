'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PreviewAttachment } from './preview-attachment'

interface Attachment {
  id: number
  title: string
  url: string | null
  size: number | null
  created_at: string
}

interface AttachmentListProps {
  refreshTrigger?: number
}

export function AttachmentList({ refreshTrigger }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchAttachments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/attachments')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch attachments')
      }

      const data = await response.json()
      setAttachments(data)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load attachments')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAttachments()
  }, [refreshTrigger])

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return 'Unknown size'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
      toast.error('No preview available for this file')
      return
    }
    setPreviewUrl(url)
  }

  const closePreview = () => {
    setPreviewUrl(null)
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading attachments...
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Course Attachments
              </CardTitle>
              <CardDescription>
                {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} available
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAttachments}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attachments found</p>
              <p className="text-sm">Upload your first file to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{attachment.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        {formatFileSize(attachment.size)}
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
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
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
