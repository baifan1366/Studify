'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Download,
  Trash2,
  X,
  Archive,
  Loader2,
  CheckCircle,
  AlertCircle,
  Brain,
  Music,
  MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { useDeleteAttachment } from '@/hooks/course/use-attachments'
import { useStartVideoProcessing } from '@/hooks/video-processing/use-video-processing'
import { useBackgroundTasks } from '@/hooks/background-tasks/use-background-tasks'

interface StorageBulkActionsProps {
  selectedFiles: number[]
  attachments: CourseAttachment[]
  ownerId: number
  onSelectionChange: (selectedFiles: number[]) => void
  onSuccess: () => void
}

interface BulkDeleteState {
  isOpen: boolean
  isDeleting: boolean
  progress: number
  results: { success: number; failed: number }
}

export function StorageBulkActions({
  selectedFiles,
  attachments,
  ownerId,
  onSelectionChange,
  onSuccess
}: StorageBulkActionsProps) {
  const t = useTranslations('StoragePage')
  const [deleteState, setDeleteState] = useState<BulkDeleteState>({
    isOpen: false,
    isDeleting: false,
    progress: 0,
    results: { success: 0, failed: 0 }
  })
  const [isProcessingVideos, setIsProcessingVideos] = useState(false)

  const deleteMutation = useDeleteAttachment()
  const startVideoProcessingMutation = useStartVideoProcessing()
  const { startVideoProcessingTask, startEmbeddingTask } = useBackgroundTasks()

  // Get selected attachment objects
  const selectedAttachments = useMemo(() => {
    return attachments.filter(att => selectedFiles.includes(att.id))
  }, [attachments, selectedFiles])

  // Statistics about selected files
  const stats = useMemo(() => {
    const totalSize = selectedAttachments.reduce((sum, att) => sum + (att.size || 0), 0)
    const typeBreakdown = selectedAttachments.reduce((acc, att) => {
      acc[att.type] = (acc[att.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      count: selectedAttachments.length,
      totalSize,
      typeBreakdown,
      videoCount: typeBreakdown.video || 0,
      documentCount: typeBreakdown.document || 0,
      imageCount: typeBreakdown.image || 0,
      audioCount: typeBreakdown.audio || 0
    }
  }, [selectedAttachments])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleClearSelection = () => {
    onSelectionChange([])
  }

  const handleDownloadAll = () => {
    selectedAttachments.forEach((attachment, index) => {
      if (attachment.url) {
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = attachment.url || ''
          link.download = attachment.title
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, index * 500) // Stagger downloads to avoid overwhelming browser
      }
    })
    
    toast.success(t('download_started', { count: selectedAttachments.length }))
  }

  const handleDeleteAll = () => {
    setDeleteState({
      isOpen: true,
      isDeleting: false,
      progress: 0,
      results: { success: 0, failed: 0 }
    })
  }

  const confirmDeleteAll = async () => {
    setDeleteState(prev => ({ ...prev, isDeleting: true, progress: 0 }))
    
    let success = 0
    let failed = 0
    const total = selectedAttachments.length

    for (let i = 0; i < selectedAttachments.length; i++) {
      const attachment = selectedAttachments[i]
      
      try {
        await deleteMutation.mutateAsync({
          id: attachment.id,
          ownerId
        })
        success++
      } catch (error) {
        console.error(`Failed to delete ${attachment.title}:`, error)
        failed++
      }
      
      // Update progress
      const progress = ((i + 1) / total) * 100
      setDeleteState(prev => ({
        ...prev,
        progress,
        results: { success, failed }
      }))
    }

    // Show results
    if (success > 0 && failed === 0) {
      toast.success(t('bulk_delete_success', { count: success }))
    } else if (success > 0 && failed > 0) {
      toast.warning(t('bulk_delete_partial', { success, failed }))
    } else {
      toast.error(t('bulk_delete_failed', { count: failed }))
    }

    // Close dialog and refresh
    setDeleteState({
      isOpen: false,
      isDeleting: false,
      progress: 0,
      results: { success: 0, failed: 0 }
    })
    
    onSelectionChange([])
    onSuccess()
  }

  const handleProcessAllVideos = async () => {
    const videoAttachments = selectedAttachments.filter(att => att.type === 'video')
    
    if (videoAttachments.length === 0) {
      toast.error(t('no_videos_selected'))
      return
    }

    setIsProcessingVideos(true)
    
    let processedCount = 0
    let failedCount = 0

    for (const attachment of videoAttachments) {
      try {
        const processingResult = await startVideoProcessingMutation.mutateAsync(attachment.id)
        
        startVideoProcessingTask(
          attachment.id,
          attachment.title,
          processingResult.queue_id
        )
        
        // Start embedding task after 5 seconds
        setTimeout(() => {
          startEmbeddingTask(attachment.id, attachment.title)
        }, 5000)
        
        processedCount++
      } catch (error) {
        console.error(`Failed to process video ${attachment.title}:`, error)
        failedCount++
      }
    }

    setIsProcessingVideos(false)

    if (processedCount > 0 && failedCount === 0) {
      toast.success(t('bulk_video_processing_success', { count: processedCount }))
    } else if (processedCount > 0 && failedCount > 0) {
      toast.warning(t('bulk_video_processing_partial', { success: processedCount, failed: failedCount }))
    } else {
      toast.error(t('bulk_video_processing_failed', { count: failedCount }))
    }
  }

  if (selectedFiles.length === 0) {
    return null
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">
              {t('selected_files', { count: stats.count })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {Object.entries(stats.typeBreakdown).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {count} {type}
              </Badge>
            ))}
          </div>
          
          <Badge variant="outline" className="text-xs">
            {formatFileSize(stats.totalSize)}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {t('clear_selection')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('download_all')}
          </Button>

          {stats.videoCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleProcessAllVideos}
              disabled={isProcessingVideos}
              className="gap-2"
            >
              {isProcessingVideos ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {t('process_videos')} ({stats.videoCount})
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                {t('download_all')}
              </DropdownMenuItem>
              
              {stats.videoCount > 0 && (
                <>
                  <DropdownMenuItem 
                    onClick={handleProcessAllVideos}
                    disabled={isProcessingVideos}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {t('process_videos')} ({stats.videoCount})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem
                onClick={handleDeleteAll}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete_all')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteState.isOpen} onOpenChange={(open) => {
        if (!open && !deleteState.isDeleting) {
          setDeleteState(prev => ({ ...prev, isOpen: false }))
        }
      }}>
        <AlertDialogContent className="bg-background text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {t('confirm_bulk_delete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulk_delete_warning', { count: stats.count })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteState.isDeleting && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('deleting_progress')}</span>
                  <span>{deleteState.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-destructive h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${deleteState.progress}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {deleteState.results.success}
                  </div>
                  <div className="text-muted-foreground">{t('deleted')}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {deleteState.results.failed}
                  </div>
                  <div className="text-muted-foreground">{t('failed')}</div>
                </div>
              </div>
            </div>
          )}

          {!deleteState.isDeleting && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">{t('files_to_delete')}:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedAttachments.slice(0, 10).map((attachment) => (
                    <div key={attachment.id} className="text-xs text-muted-foreground">
                      • {attachment.title}
                    </div>
                  ))}
                  {selectedAttachments.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      {t('and_more', { count: selectedAttachments.length - 10 })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <strong>{t('warning')}:</strong> {t('bulk_delete_irreversible')}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteState.isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={deleteState.isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteState.isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete_selected', { count: stats.count })}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
