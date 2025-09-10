'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { validateAttachmentTitle } from '@/lib/validations/attachment'
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
  X,
  EllipsisVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { useAttachments, useUploadAttachment, useUpdateAttachment, useDeleteAttachment } from '@/hooks/course/use-attachments'
import { PreviewAttachment } from './preview-attachment'
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
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<EditDialogState>({ isOpen: false, attachment: null })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ isOpen: false, attachment: null })
  
  // Upload form state
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTitleError, setEditTitleError] = useState<string | null>(null)

  // Hooks
  const { data: attachments = [], isLoading, refetch } = useAttachments(ownerId)
  const uploadMutation = useUploadAttachment()
  const updateMutation = useUpdateAttachment()
  const deleteMutation = useDeleteAttachment()

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (selectedFile.size > maxSize) {
        toast.error('File size exceeds 100MB limit')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!file) {
      toast.error('Please select a file')
      return
    }

    try {
      await uploadMutation.mutateAsync({
        ownerId,
        title: title.trim(),
        file
      })

      // Clear form
      setTitle('')
      setFile(null)
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

      // Switch to manage tab to see uploaded file
      setActiveTab('manage')
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handlePreview = (url: string | null) => {
    if (!url) {
      toast.error('No preview available for this file')
      return
    }
    setPreviewUrl(url)
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-background text-foreground border-border">
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
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    {t('upload_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('upload_description')}
                  </CardDescription>
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
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={uploadMutation.isPending}
                        required
                      />
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
                        <p className="text-sm text-muted-foreground">
                          Selected: {file.name} ({formatFileSize(file.size)})
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('max_file_size')}
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={uploadMutation.isPending || !title.trim() || !file}
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('uploading')}
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
                      Loading attachments...
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
                              {formatDate(attachment.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePreview(attachment.url)}
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
      {previewUrl && (
        <PreviewAttachment url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({ isOpen: false, attachment: null })
          setEditTitle('')
          setEditTitleError(null)
        }
      }}>
        <DialogContent className="bg-background text-foreground border-border [&>button]:hidden">
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
    </>
  )
}
