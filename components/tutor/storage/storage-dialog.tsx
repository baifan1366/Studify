'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { validateAttachmentTitle } from '@/lib/validations/attachment'
import { useFormat } from '@/hooks/use-format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  HardDrive,
  Upload,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  EllipsisVertical,
  Music,
  Download,
  Play,
  Brain,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { useAttachments, useUploadAttachment, useUpdateAttachment, useDeleteAttachment } from '@/hooks/course/use-attachments'
import { useBackgroundTasks } from '@/hooks/background-tasks/use-background-tasks'
import { useStartVideoProcessing } from '@/hooks/video-processing/use-video-processing'
import { PreviewAttachment } from './preview-attachment'
// VideoProcessingProgress is no longer needed - using toast notifications instead
import { CourseAttachment } from '@/interface/courses/attachment-interface'

interface StorageDialogProps {
  ownerId: number
  children?: React.ReactNode
}

interface EditDialogState {
  isOpen: boolean
  attachment: CourseAttachment | null
}

interface DeleteDialogState {
  isOpen: boolean
  attachment: CourseAttachment | null
}

export function StorageDialog({ ownerId, children }: StorageDialogProps) {
  const t = useTranslations('StorageDialog')
  const { formatDate } = useFormat()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [previewData, setPreviewData] = useState<{ url: string; attachmentId: number; fileType: string } | null>(null)
  const [editDialog, setEditDialog] = useState<EditDialogState>({ isOpen: false, attachment: null })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ isOpen: false, attachment: null })
  // videoProcessingState is no longer needed - using background tasks with toast
  
  // Upload form state
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTitleError, setEditTitleError] = useState<string | null>(null)
  
  // Client-side upload state
  const [uploadProgress, setUploadProgress] = useState(0)

  // Hooks
  const { data: attachments = [], isLoading, refetch } = useAttachments(ownerId)
  const uploadMutation = useUploadAttachment()
  const updateMutation = useUpdateAttachment()
  const deleteMutation = useDeleteAttachment()
  const startVideoProcessingMutation = useStartVideoProcessing()
  const { startVideoProcessingTask, startEmbeddingTask } = useBackgroundTasks()

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return 'Unknown size'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadProgress(0)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    // Validate title before uploading
    const titleValidation = validateAttachmentTitle(title.trim())
    if (!titleValidation.success) {
      setTitleError(titleValidation.error || t('invalid_title'))
      return
    }

    if (!file) {
      toast.error('Please select a file')
      return
    }

    setTitleError(null)
    setUploadProgress(0)
    
    try {
      const uploadResult = await uploadMutation.mutateAsync({
        title: title.trim(),
        file,
        onProgress: (progress) => {
          setUploadProgress(progress)
        }
      })

      // Check if uploaded file is a video and automatically process it
      if (file.type.startsWith('video/') && uploadResult?.id) {
        toast.success('Video uploaded! Starting background AI processing...', {
          description: 'You can continue working while we process your video'
        })
        
        // Start video processing in the background (non-blocking)
        try {
          const processingResult = await startVideoProcessingMutation.mutateAsync(uploadResult.id)
          
          // Start background monitoring
          const taskId = startVideoProcessingTask(
            uploadResult.id,
            uploadResult.title || title.trim(),
            processingResult.queue_id
          )
          
          // Start embedding generation monitoring
          setTimeout(() => {
            startEmbeddingTask(
              uploadResult.id,
              uploadResult.title || title.trim()
            )
          }, 5000) // Start after 5 seconds
          
        } catch (processError) {
          console.error('Video processing error:', processError)
          toast.error('Video uploaded but failed to start AI processing. You can retry processing later.')
        }
      }

      // Clear form
      setTitle('')
      setFile(null)
      setTitleError(null)
      setUploadProgress(0)
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

      // Switch to manage tab to see uploaded file
      setActiveTab('manage')
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setUploadProgress(0)
    }
  }


  const handlePreview = (attachment: CourseAttachment) => {
    if (!attachment.url) {
      toast.error('No preview available for this file')
      return
    }
    setPreviewData({ url: attachment.url, attachmentId: attachment.id, fileType: attachment.type })
  }

  const handleEdit = (attachment: CourseAttachment) => {
    setEditDialog({ isOpen: true, attachment })
    setEditTitle(attachment.title)
    setEditTitleError(null)
  }

  const handleSaveEdit = async () => {
    if (!editDialog.attachment || !editTitle.trim()) return

    // Validate title before saving
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
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleProcessVideo = async (attachment: CourseAttachment) => {
    try {
      toast.success('Starting background video processing...', {
        description: 'You can continue working while we process your video'
      })
      
      const processingResult = await startVideoProcessingMutation.mutateAsync(attachment.id)
      
      // Start background monitoring (non-blocking)
      const taskId = startVideoProcessingTask(
        attachment.id,
        attachment.title,
        processingResult.queue_id
      )
      
      // Start embedding generation monitoring
      setTimeout(() => {
        startEmbeddingTask(
          attachment.id,
          attachment.title
        )
      }, 5000) // Start after 5 seconds
      
    } catch (error) {
      console.error('Video processing error:', error)
      toast.error('Failed to start video processing. Please try again later.')
    }
  }


  const attachmentCount = attachments.length
  const pluralSuffix = attachmentCount !== 1 ? 's' : ''

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild={!!children}>
          {children || (
            <Button variant="default" className="gap-2">
              <HardDrive className="h-4 w-4" />
              {t('title')}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                {t('upload_tab')}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <FileText className="h-4 w-4" />
                {t('manage_tab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <Card className="bg-transparent">
                <CardHeader>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      {t('upload_title')}
                    </CardTitle>
                    <CardDescription>
                      {t('upload_description')}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">{t('file_title_label')}</Label>
                      <Input
                        id="title"
                        type="text"
                        placeholder={t('file_title_placeholder')}
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value)
                          // Clear error when user starts typing
                          if (titleError) {
                            setTitleError(null)
                          }
                        }}
                        disabled={uploadMutation.isPending}
                        className={titleError ? 'border-destructive' : ''}
                        required
                      />
                      {titleError && (
                        <p className="text-sm text-destructive mt-1">{titleError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file-input">{t('select_file_label')}</Label>
                      <Input
                        id="file-input"
                        type="file"
                        onChange={handleFileChange}
                        disabled={uploadMutation.isPending}
                        required
                      />
                      {file && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {t('selected')}: {file.name} ({formatFileSize(file.size)})
                          </p>
                          {uploadMutation.isPending && uploadProgress > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Upload Progress</span>
                                <span>{uploadProgress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={uploadMutation.isPending || !title.trim() || !file || !!titleError}
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploadProgress > 0 ? `Uploading... ${uploadProgress.toFixed(0)}%` : t('uploading')}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {t('upload_button')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="mt-6 overflow-hidden">
              <Card className="h-full overflow-hidden bg-transparent">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t('attachments_title')}
                      </CardTitle>
                      <CardDescription>
                        {t('attachments_count', { 
                          count: attachmentCount, 
                          plural: pluralSuffix 
                        })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => refetch()}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('refresh')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-auto max-h-96">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      {t('loading_attachments')}
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('no_attachments')}</p>
                      <p className="text-sm">{t('no_attachments_description')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('file_name')}</TableHead>
                          <TableHead>{t('file_size')}</TableHead>
                          <TableHead>{t('upload_date')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attachments.map((attachment) => (
                          <TableRow key={attachment.id}>
                            <TableCell className="font-medium">
                              {attachment.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {formatFileSize(attachment.size)}
                              </Badge>
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
                              <div className="flex items-center justify-end gap-2">
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
                                      <EllipsisVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {attachment.type === 'video' && (
                                      <DropdownMenuItem 
                                        onClick={() => handleProcessVideo(attachment)}
                                        disabled={startVideoProcessingMutation.isPending}
                                      >
                                        <Brain className="h-4 w-4 mr-2" />
                                        {startVideoProcessingMutation.isPending ? 'Starting...' : 'Process for AI'}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleEdit(attachment)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      {t('edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(attachment)}
                                      className="text-destructive"
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewData && (
        <PreviewAttachment 
          attachmentId={previewData.attachmentId}
          onClose={() => setPreviewData(null)}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({ isOpen: false, attachment: null })
          setEditTitle('')
          setEditTitleError(null)
        }
      }}>
        <DialogContent className="bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t('edit_title')}
            </DialogTitle>
            <DialogDescription>
              {t('edit_description')}
            </DialogDescription>
          </DialogHeader>
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
                  // Clear error when user starts typing
                  if (editTitleError) {
                    setEditTitleError(null)
                  }
                }}
                disabled={updateMutation.isPending}
                className={editTitleError ? 'border-destructive' : ''}
              />
              {editTitleError && (
                <p className="text-sm text-destructive mt-1">{editTitleError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialog({ isOpen: false, attachment: null })
                  setEditTitle('')
                  setEditTitleError(null)
                }}
                disabled={updateMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
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
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ isOpen: false, attachment: null })
        }
      }}>
        <AlertDialogContent className="bg-background text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_description')}
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

      {/* Video processing progress is now handled via toast notifications */}
    </>
  )
}
