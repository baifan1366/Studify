'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { useUploadAttachment } from '@/hooks/course/use-attachments'
import { useStartVideoProcessing } from '@/hooks/video-processing/use-video-processing'
import { useBackgroundTasks } from '@/hooks/background-tasks/use-background-tasks'
import { validateAttachmentTitle, validateFile, formatFileSize, SUPPORTED_FILE_TYPES } from '@/lib/validations/attachment'

interface FileUploadItem {
  id: string
  file: File
  title: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  titleError?: string
}

interface StorageUploadZoneProps {
  ownerId: number
  onUploadSuccess?: () => void
  onClose?: () => void
}

export function StorageUploadZone({ ownerId, onUploadSuccess, onClose }: StorageUploadZoneProps) {
  const t = useTranslations('StoragePage')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const uploadMutation = useUploadAttachment()
  const startVideoProcessingMutation = useStartVideoProcessing()
  const { startVideoProcessingTask, startEmbeddingTask } = useBackgroundTasks()

  const getFileIcon = (file: File) => {
    const type = file.type
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-green-500" />
    if (type.startsWith('video/')) return <Video className="h-5 w-5 text-blue-500" />
    if (type.startsWith('audio/')) return <Music className="h-5 w-5 text-purple-500" />
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) {
      return <FileText className="h-5 w-5 text-orange-500" />
    }
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) {
      return <Archive className="h-5 w-5 text-yellow-500" />
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newItems: FileUploadItem[] = []

    fileArray.forEach((file) => {
      // Validate file
      const validation = validateFile(file)
      if (!validation.success) {
        toast.error(`${file.name}: ${validation.error}`)
        return
      }

      const item: FileUploadItem = {
        id: generateId(),
        file,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for default title
        progress: 0,
        status: 'pending'
      }
      newItems.push(item)
    })

    setUploadItems(prev => [...prev, ...newItems])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = '' // Reset input
    }
  }, [handleFiles])

  const updateItem = (id: string, updates: Partial<FileUploadItem>) => {
    setUploadItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id))
  }

  const handleTitleChange = (id: string, title: string) => {
    const validation = validateAttachmentTitle(title)
    updateItem(id, { 
      title, 
      titleError: validation.success ? undefined : validation.error || '' 
    })
  }

  const uploadFile = async (item: FileUploadItem) => {
    // Validate title before upload
    const titleValidation = validateAttachmentTitle(item.title)
    if (!titleValidation.success) {
      updateItem(item.id, { 
        status: 'error', 
        error: titleValidation.error || '',
        titleError: titleValidation.error || '' 
      })
      return
    }

    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined })

    try {
      const result = await uploadMutation.mutateAsync({
        title: item.title.trim(),
        file: item.file,
        onProgress: (progress) => {
          updateItem(item.id, { progress })
        }
      })

      updateItem(item.id, { status: 'completed', progress: 100 })

      // Auto-process videos
      if (item.file.type.startsWith('video/') && result?.id) {
        toast.success(t('video_uploaded_processing'), {
          description: t('video_processing_background')
        })
        
        try {
          const processingResult = await startVideoProcessingMutation.mutateAsync(result.id)
          
          startVideoProcessingTask(
            result.id,
            result.title || item.title.trim(),
            processingResult.queue_id
          )
          
          setTimeout(() => {
            startEmbeddingTask(result.id, result.title || item.title.trim())
          }, 5000)
        } catch (processError: any) {
          console.error('Video processing error:', processError)
          
          // Show more specific error message
          const errorMessage = processError?.message || t('video_processing_failed')
          toast.error(errorMessage, {
            description: 'You can retry processing from the storage page later',
            duration: 5000
          })
        }
      }

      onUploadSuccess?.()
    } catch (error: any) {
      updateItem(item.id, { 
        status: 'error', 
        error: error.message || t('upload_failed') 
      })
    }
  }

  const handleUploadAll = async () => {
    const pendingItems = uploadItems.filter(item => item.status === 'pending')
    
    // Upload files sequentially to avoid overwhelming the server
    for (const item of pendingItems) {
      await uploadFile(item)
    }
  }

  const pendingCount = uploadItems.filter(item => item.status === 'pending').length
  const uploadingCount = uploadItems.filter(item => item.status === 'uploading').length
  const completedCount = uploadItems.filter(item => item.status === 'completed').length
  const errorCount = uploadItems.filter(item => item.status === 'error').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('upload_files')}</h3>
          <p className="text-sm text-muted-foreground">{t('upload_description')}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept={SUPPORTED_FILE_TYPES.join(',')}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragOver ? t('drop_files_here') : t('drag_drop_files')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('or')} 
              <Button 
                variant="link" 
                className="p-0 h-auto font-medium"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('browse_files')}
              </Button>
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>{t('supported_formats')}</p>
            <p>{t('max_file_size')}</p>
          </div>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{t('upload_queue')}</h4>
              <Badge variant="secondary">
                {uploadItems.length} {t('files')}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Button
                  onClick={handleUploadAll}
                  disabled={uploadMutation.isPending}
                  size="sm"
                  className="gap-2"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {t('upload_all')}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadItems([])}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('clear_all')}
              </Button>
            </div>
          </div>

          {/* Upload Stats */}
          {(uploadingCount > 0 || completedCount > 0 || errorCount > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">{t('pending')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">{uploadingCount}</div>
                <div className="text-xs text-muted-foreground">{t('uploading')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{completedCount}</div>
                <div className="text-xs text-muted-foreground">{t('completed')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{errorCount}</div>
                <div className="text-xs text-muted-foreground">{t('failed')}</div>
              </div>
            </div>
          )}

          {/* File List */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {uploadItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(item.file)}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                    
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {item.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {item.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Title Input */}
                  <div className="space-y-1">
                    <Label className="text-xs">{t('file_title')}</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => handleTitleChange(item.id, e.target.value)}
                      disabled={item.status === 'uploading' || item.status === 'completed'}
                      className={`text-sm ${item.titleError ? 'border-destructive' : ''}`}
                      placeholder={t('enter_file_title')}
                    />
                    {item.titleError && (
                      <p className="text-xs text-destructive">{item.titleError}</p>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  {item.status === 'uploading' && (
                    <div className="space-y-1">
                      <Progress value={item.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {item.progress.toFixed(0)}% {t('uploaded')}
                      </p>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {item.error && (
                    <p className="text-xs text-destructive">{item.error}</p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex-shrink-0">
                  {item.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => uploadFile(item)}
                        disabled={!!item.titleError || !item.title.trim()}
                        className="h-8 px-2"
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {item.status === 'error' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => uploadFile(item)}
                        disabled={!!item.titleError || !item.title.trim()}
                        className="h-8 px-2"
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {item.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
