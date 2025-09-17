'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useUploadAttachment } from '@/hooks/course/use-attachments'
import { validateAttachmentTitle, validateFile, formatFileSize, SUPPORTED_FILE_TYPES } from '@/lib/validations/attachment'

interface UploadAttachmentProps {
  ownerId: number
  onUploadSuccess?: () => void
}

export function UploadAttachment({ ownerId, onUploadSuccess }: UploadAttachmentProps) {
  const t = useTranslations('StorageDialog')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const uploadMutation = useUploadAttachment()

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    
    // Real-time validation
    if (newTitle.trim()) {
      const validation = validateAttachmentTitle(newTitle)
      setTitleError(validation.success ? null : validation.error)
    } else {
      setTitleError(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setFileError(null)
    
    if (selectedFile) {
      // Validate file
      const validation = validateFile(selectedFile)
      if (!validation.success) {
        setFileError(validation.error)
        setFile(null)
        return
      }
      
      setFile(selectedFile)
    } else {
      setFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate title
    const titleValidation = validateAttachmentTitle(title)
    if (!titleValidation.success) {
      setTitleError(titleValidation.error)
      return
    }

    // Validate file
    if (!file) {
      setFileError(t('select_file_required'))
      return
    }

    const fileValidation = validateFile(file)
    if (!fileValidation.success) {
      setFileError(fileValidation.error)
      return
    }

    try {
      await uploadMutation.mutateAsync({
        title: title.trim(),
        file
      })
      
      // Clear form and errors
      setTitle('')
      setFile(null)
      setTitleError(null)
      setFileError(null)
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      
      // Notify parent component
      onUploadSuccess?.()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const getSupportedFileTypesText = () => {
    const categories = {
      documents: ['PDF', 'Word', 'Excel', 'PowerPoint', 'Text'],
      images: ['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'],
      videos: ['MP4', 'AVI', 'MOV', 'WebM'],
      audio: ['MP3', 'WAV', 'OGG', 'M4A'],
      archives: ['ZIP', 'RAR', '7Z']
    }
    
    return Object.entries(categories)
      .map(([category, types]) => `${category}: ${types.join(', ')}`)
      .join(' | ')
  }

  return (
    <Card className="w-full max-w-md bg-card text-card-foreground border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Upload className="h-5 w-5" />
          {t('upload_title')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('upload_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">{t('file_title_label')}</Label>
            <Input
              id="title"
              type="text"
              placeholder={t('file_title_placeholder')}
              value={title}
              onChange={handleTitleChange}
              disabled={uploadMutation.isPending}
              className={`bg-background text-foreground border-border ${titleError ? 'border-destructive' : ''}`}
              required
            />
            {titleError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{titleError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-input" className="text-foreground">{t('select_file_label')}</Label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
              className={`bg-background text-foreground border-border ${fileError ? 'border-destructive' : ''}`}
              accept={SUPPORTED_FILE_TYPES.join(',')}
              required
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                {t('selected_file')}: {file.name} ({formatFileSize(file.size)})
              </p>
            )}
            {fileError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{fileError}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t('max_file_size')}</p>
              <p className="break-words">{t('supported_types')}: {getSupportedFileTypesText()}</p>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={uploadMutation.isPending || !title.trim() || !file || !!titleError || !!fileError}
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
  )
}
