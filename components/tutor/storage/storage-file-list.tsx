'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/hooks/use-format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  Image,
  Video,
  Music,
  File,
  Eye,
  Edit,
  Trash2,
  Download,
  Share2,
  MoreHorizontal,
  Loader2,
  Brain,
  Calendar,
  HardDrive,
  PlayCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { useUpdateAttachment, useDeleteAttachment } from '@/hooks/course/use-attachments'
import { useStartVideoProcessing } from '@/hooks/video-processing/use-video-processing'
import { useBackgroundTasks } from '@/hooks/background-tasks/use-background-tasks'
import { validateAttachmentTitle } from '@/lib/validations/attachment'
import { PreviewAttachment } from './preview-attachment'
import { VideoPreview } from './video-preview'
import type { ViewMode } from './storage-page-layout'

interface StorageFileListProps {
  attachments: CourseAttachment[]
  viewMode: ViewMode
  selectedFiles: number[]
  onFileSelect: (fileId: number, selected: boolean) => void
  ownerId: number
  isLoading: boolean
  onRefresh: () => void
}

interface EditDialogState {
  isOpen: boolean
  attachment: CourseAttachment | null
}

interface DeleteDialogState {
  isOpen: boolean
  attachment: CourseAttachment | null
}

export function StorageFileList({
  attachments,
  viewMode,
  selectedFiles,
  onFileSelect,
  ownerId,
  isLoading,
  onRefresh
}: StorageFileListProps) {
  const t = useTranslations('StoragePage')
  const { formatDate } = useFormat()
  const [previewData, setPreviewData] = useState<{ 
    url: string
    attachmentId: number
    fileType: string
    title?: string 
  } | null>(null)
  const [editDialog, setEditDialog] = useState<EditDialogState>({ isOpen: false, attachment: null })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ isOpen: false, attachment: null })
  const [editTitle, setEditTitle] = useState('')
  const [editTitleError, setEditTitleError] = useState<string | null>(null)

  // Hooks
  const updateMutation = useUpdateAttachment()
  const deleteMutation = useDeleteAttachment()
  const startVideoProcessingMutation = useStartVideoProcessing()
  const { startVideoProcessingTask, startEmbeddingTask } = useBackgroundTasks()

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return t('unknown_size')
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5 text-green-500" />
      case 'video':
        return <Video className="h-5 w-5 text-blue-500" />
      case 'audio':
        return <Music className="h-5 w-5 text-purple-500" />
      case 'document':
        return <FileText className="h-5 w-5 text-orange-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'video':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'audio':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'document':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const handlePreview = (attachment: CourseAttachment) => {
    if (!attachment.url) {
      toast.error(t('no_preview_available'))
      return
    }
    setPreviewData({
      url: attachment.url,
      attachmentId: attachment.id,
      fileType: attachment.type,
      title: attachment.title
    })
  }

  const handleEdit = (attachment: CourseAttachment) => {
    setEditDialog({ isOpen: true, attachment })
    setEditTitle(attachment.title)
    setEditTitleError(null)
  }

  const handleSaveEdit = async () => {
    if (!editDialog.attachment || !editTitle.trim()) return

    const titleValidation = validateAttachmentTitle(editTitle.trim())
    if (!titleValidation.success) {
      setEditTitleError(titleValidation.error || t('invalid_title'))
      return
    }

    setEditTitleError(null)
    try {
      await updateMutation.mutateAsync({
        id: editDialog.attachment.id,
        title: editTitle.trim(),
        ownerId
      })

      setEditDialog({ isOpen: false, attachment: null })
      setEditTitle('')
      onRefresh()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleDelete = (attachment: CourseAttachment) => {
    setDeleteDialog({ isOpen: true, attachment })
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog.attachment) return

    try {
      await deleteMutation.mutateAsync({
        id: deleteDialog.attachment.id,
        ownerId
      })

      setDeleteDialog({ isOpen: false, attachment: null })
      onRefresh()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleProcessVideo = async (attachment: CourseAttachment) => {
    try {
      toast.success(t('starting_video_processing'), {
        description: t('video_processing_background')
      })
      
      const processingResult = await startVideoProcessingMutation.mutateAsync(attachment.id)
      
      startVideoProcessingTask(
        attachment.id,
        attachment.title,
        processingResult.queue_id
      )
      
      setTimeout(() => {
        startEmbeddingTask(attachment.id, attachment.title)
      }, 5000)
      
    } catch (error) {
      console.error('Video processing error:', error)
      toast.error(t('video_processing_failed'))
    }
  }

  const handleDownload = (attachment: CourseAttachment) => {
    if (attachment.url) {
      const link = document.createElement('a')
      link.href = attachment.url
      link.download = attachment.title
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span className="text-muted-foreground">{t('loading_files')}</span>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-12">
        <HardDrive className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-foreground mb-2">{t('no_files')}</h3>
        <p className="text-muted-foreground">{t('no_files_description')}</p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedFiles.length === attachments.length && attachments.length > 0}
                    onChange={(e) => {
                      attachments.forEach(attachment => {
                        onFileSelect(attachment.id, e.target.checked)
                      })
                    }}
                    className="rounded border-border"
                  />
                </TableHead>
                <TableHead>{t('file_name')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('file_size')}</TableHead>
                <TableHead>{t('upload_date')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((attachment) => (
                <TableRow 
                  key={attachment.id}
                  className={selectedFiles.includes(attachment.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(attachment.id)}
                      onChange={(e) => onFileSelect(attachment.id, e.target.checked)}
                      className="rounded border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getFileIcon(attachment.type)}
                      <span className="font-medium text-foreground truncate max-w-xs">
                        {attachment.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getFileTypeColor(attachment.type)} text-xs`}>
                      {attachment.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(attachment.created_at, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(attachment)}
                        disabled={!attachment.url}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {attachment.type === 'video' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleProcessVideo(attachment)}
                                disabled={startVideoProcessingMutation.isPending}
                              >
                                <Brain className="h-4 w-4 mr-2" />
                                {startVideoProcessingMutation.isPending ? t('starting') : t('process_ai')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                            <Download className="h-4 w-4 mr-2" />
                            {t('download')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(attachment)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(attachment)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Preview Modal */}
        {previewData && (
          previewData.fileType === 'video' ? (
            <VideoPreview 
              attachmentId={previewData.attachmentId}
              title={previewData.title}
              onClose={() => setPreviewData(null)}
            />
          ) : (
            <PreviewAttachment 
              attachmentId={previewData.attachmentId}
              onClose={() => setPreviewData(null)}
            />
          )
        )}

        {/* Edit Dialog */}
        <AlertDialog open={editDialog.isOpen} onOpenChange={(open) => {
          if (!open) {
            setEditDialog({ isOpen: false, attachment: null })
            setEditTitle('')
            setEditTitleError(null)
          }
        }}>
          <AlertDialogContent className="bg-background text-foreground border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                {t('edit_file')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('edit_file_description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('file_title_label')}</Label>
                <Input
                  id="edit-title"
                  type="text"
                  placeholder={t('file_title_placeholder')}
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value)
                    if (editTitleError) {
                      setEditTitleError(null)
                    }
                  }}
                  disabled={updateMutation.isPending}
                  className={editTitleError ? 'border-destructive' : ''}
                />
                {editTitleError && (
                  <p className="text-sm text-destructive">{editTitleError}</p>
                )}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updateMutation.isPending}>
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending || !editTitle.trim() || !!editTitleError}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save_changes')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, attachment: null })
          }
        }}>
          <AlertDialogContent className="bg-background text-foreground border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('delete_file')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('delete_file_description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  t('confirm_delete')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Grid view
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {attachments.map((attachment) => (
          <Card 
            key={attachment.id}
            className={`group hover:shadow-md transition-all duration-200 ${
              selectedFiles.includes(attachment.id) 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:border-primary/50'
            }`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header with checkbox and actions */}
                <div className="flex items-start justify-between">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(attachment.id)}
                    onChange={(e) => onFileSelect(attachment.id, e.target.checked)}
                    className="rounded border-border mt-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(attachment)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('preview')}
                      </DropdownMenuItem>
                      {attachment.type === 'video' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => handleProcessVideo(attachment)}
                            disabled={startVideoProcessingMutation.isPending}
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            {t('process_ai')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('download')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(attachment)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(attachment)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* File icon and preview */}
                <div 
                  className="flex items-center justify-center h-20 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handlePreview(attachment)}
                >
                  {attachment.type === 'video' ? (
                    <div className="relative">
                      {getFileIcon(attachment.type)}
                      <PlayCircle className="h-4 w-4 absolute -top-1 -right-1 text-blue-400" />
                    </div>
                  ) : (
                    getFileIcon(attachment.type)
                  )}
                </div>

                {/* File details */}
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground text-sm truncate" title={attachment.title}>
                    {attachment.title}
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <Badge className={`${getFileTypeColor(attachment.type)} text-xs`}>
                      {attachment.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(attachment.created_at, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-1 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handlePreview(attachment)}
                    disabled={!attachment.url}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('preview')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t('download')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals for grid view */}
      {previewData && (
        previewData.fileType === 'video' ? (
          <VideoPreview 
            attachmentId={previewData.attachmentId}
            title={previewData.title}
            onClose={() => setPreviewData(null)}
          />
        ) : (
          <PreviewAttachment 
            attachmentId={previewData.attachmentId}
            onClose={() => setPreviewData(null)}
          />
        )
      )}

      {/* Edit Dialog for grid view */}
      <AlertDialog open={editDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({ isOpen: false, attachment: null })
          setEditTitle('')
          setEditTitleError(null)
        }
      }}>
        <AlertDialogContent className="bg-background text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t('edit_file')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('edit_file_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t('file_title_label')}</Label>
              <Input
                id="edit-title"
                type="text"
                placeholder={t('file_title_placeholder')}
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value)
                  if (editTitleError) {
                    setEditTitleError(null)
                  }
                }}
                disabled={updateMutation.isPending}
                className={editTitleError ? 'border-destructive' : ''}
              />
              {editTitleError && (
                <p className="text-sm text-destructive">{editTitleError}</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editTitle.trim() || !!editTitleError}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save_changes')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog for grid view */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ isOpen: false, attachment: null })
        }
      }}>
        <AlertDialogContent className="bg-background text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_file')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_file_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('confirm_delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
