'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { courseLessonSchema } from '@/lib/validations/course-lesson'
import { useUpdateLesson } from '@/hooks/course/use-course-lesson'
import { useAttachments, useUserStorageAttachments } from '@/hooks/course/use-attachments'
import { Lesson } from '@/interface/courses/lesson-interface'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  Edit, 
  FileText, 
  Play, 
  Clock, 
  Link, 
  File,
  Eye,
  Circle,
  Star,
  HardDrive
} from 'lucide-react'
import { StorageDialog } from '@/components/tutor/storage/storage-dialog'
import { useUser } from '@/hooks/profile/use-user'
import { useStartVideoProcessing } from '@/hooks/video-processing/use-video-processing'

interface EditCourseLessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: Lesson | null
  courseId: number
  moduleId: number
}

export function EditCourseLessonDialog({
  open,
  onOpenChange,
  lesson,
  courseId,
  moduleId
}: EditCourseLessonDialogProps) {
  const t = useTranslations('CreateCourseLesson')
  const lessonT = useTranslations('CourseLessonSchema')
  const gridT = useTranslations('CourseLessonGrid')
  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'video' | 'live' | 'document' | 'quiz' | 'assignment' | 'whiteboard'>('video')
  const [contentUrl, setContentUrl] = useState('manual-url')
  const [manualUrl, setManualUrl] = useState('')
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([])
  const [durationSec, setDurationSec] = useState<number | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hooks
  const updateLessonMutation = useUpdateLesson()
  const { data: attachments = [], isLoading: attachmentsLoading } = useAttachments(courseId)
  const { data: userData } = useUser()
  const userProfileId = userData?.profile?.id ? parseInt(userData.profile.id) : undefined
  const { data: storageAttachments = [], isLoading: storageLoading } = useUserStorageAttachments(userProfileId)
  const startVideoProcessingMutation = useStartVideoProcessing()

  // Initialize form when lesson changes
  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title)
      setKind(lesson.kind)
      
      // Handle existing lesson data
      if (lesson.attachments && lesson.attachments.length > 0) {
        // Lesson has attachments - find matching attachment and set selection
        const attachmentId = lesson.attachments[0] // Take first attachment
        const allAttachments = [...attachments, ...storageAttachments]
        const matchingAttachment = allAttachments.find(att => att.id === attachmentId)
        if (matchingAttachment) {
          setContentUrl(matchingAttachment.url || `attachment-${attachmentId}`)
          setSelectedAttachments(lesson.attachments)
        } else {
          setContentUrl(`attachment-${attachmentId}`)
          setSelectedAttachments(lesson.attachments)
        }
        setManualUrl('')
      } else if (lesson.content_url) {
        // Lesson has manual URL
        setContentUrl('manual-url')
        setManualUrl(lesson.content_url)
        setSelectedAttachments([])
      } else {
        // No content
        setContentUrl('manual-url')
        setManualUrl('')
        setSelectedAttachments([])
      }
      
      setDurationSec(lesson.duration_sec)
      setErrors({})
    }
  }, [lesson, attachments, storageAttachments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lesson || !courseId || !moduleId) return

    setIsSubmitting(true)
    setErrors({})

    try {
      // Create validation schema with translation function
      const schema = courseLessonSchema(lessonT)
      
      // Validate the form data
      // Handle content URL vs attachments logic
      let finalContentUrl: string | undefined
      let finalAttachments: number[] = []
      
      if (contentUrl === 'manual-url') {
        // Manual URL - save to content_url field
        finalContentUrl = manualUrl.trim() || undefined
      } else if (contentUrl === 'loading' || contentUrl === 'no-attachments') {
        finalContentUrl = undefined
      } else {
        // Selected attachment - extract attachment ID and save to attachments array
        const allAttachments = [...attachments, ...storageAttachments]
        const selectedAttachment = allAttachments.find(att => 
          att.url === contentUrl || `attachment-${att.id}` === contentUrl
        )
        if (selectedAttachment) {
          finalAttachments = [selectedAttachment.id]
          finalContentUrl = undefined // Don't save URL when using attachments
        } else {
          finalContentUrl = contentUrl || undefined
        }
      }
      
      const validationData = {
        courseId,
        moduleId,
        title: title.trim(),
        kind,
        content_url: finalContentUrl,
        attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
        duration_sec: durationSec
      }
      
      const validatedData = schema.parse(validationData)

      await updateLessonMutation.mutateAsync({
        courseId,
        moduleId,
        lessonId: lesson.id,
        body: {
          title: validatedData.title,
          kind: validatedData.kind,
          content_url: validatedData.content_url,
          attachments: validatedData.attachments,
          duration_sec: validatedData.duration_sec
        }
      })

      // Check if we selected a video attachment and trigger video processing
      if (finalAttachments.length > 0) {
        const allAttachments = [...attachments, ...storageAttachments];
        const selectedAttachment = allAttachments.find(att => 
          finalAttachments.includes(att.id)
        );
        
        // Only process if it's a newly selected video attachment (not already processed)
        if (selectedAttachment && selectedAttachment.type === 'video') {
          // Check if the attachment was changed (different from original lesson attachments)
          const wasAttachmentChanged = !lesson.attachments || 
            lesson.attachments.length === 0 || 
            !lesson.attachments.includes(selectedAttachment.id);
            
          if (wasAttachmentChanged) {
            try {
              await startVideoProcessingMutation.mutateAsync(selectedAttachment.id);
            } catch (error) {
              console.error('Failed to start video processing:', error);
              // Don't show error to user as the lesson was updated successfully
              // The video processing can be retried later
            }
          }
        }
      }

      toast({
        title: gridT('success'),
        description: gridT('lessonUpdated'),
      })

      onOpenChange(false)
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const validationErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            validationErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(validationErrors)
        
        toast({
          title: gridT('validationError'),
          description: gridT('pleaseFixErrors'),
          variant: 'destructive',
        })
      } else {
        toast({
          title: gridT('error'),
          description: gridT('updateError'),
          variant: 'destructive',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAttachmentChange = (value: string) => {
    setContentUrl(value)
    if (value === 'manual-url' || value === 'loading' || value === 'no-attachments') {
      setSelectedAttachments([])
    } else {
      setManualUrl('')
      // Extract attachment ID if it's an attachment selection
      const allAttachments = [...attachments, ...storageAttachments]
      const selectedAttachment = allAttachments.find(att => 
        att.url === value || `attachment-${att.id}` === value
      )
      if (selectedAttachment) {
        setSelectedAttachments([selectedAttachment.id])
      } else {
        setSelectedAttachments([])
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] bg-background text-foreground border-border overflow-auto">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <DialogHeader className="px-8 pt-2 pb-2 border-b border-border/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Edit className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {gridT('editLesson')}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2 text-base">
                  {gridT('editLessonDescription')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-8 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t('basic_information')}</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('title_label')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="edit-title"
                      placeholder={t('title_placeholder')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className={cn(
                        "h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                        errors.title && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                      maxLength={100}
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-destructive">{errors.title || ''}</span>
                      <span className={cn(
                        "text-muted-foreground",
                        title.length > 90 && "text-orange-500",
                        title.length >= 100 && "text-destructive"
                      )}>{title.length}/100</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-duration" className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('duration_label')}
                    </Label>
                    <Input
                      type="number"
                      id="edit-duration"
                      placeholder={t('duration_placeholder')}
                      value={durationSec || ''}
                      onChange={(e) => setDurationSec(e.target.value ? parseInt(e.target.value) : undefined)}
                      className={cn(
                        "h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                        errors.duration_sec && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                      min="0"
                      max="86400"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-destructive">{errors.duration_sec || ''}</span>
                      <span className="text-muted-foreground">
                        {durationSec ? `${Math.ceil(durationSec / 60)}min` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lesson Type & Content Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-8 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t('lesson_type_content')}</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-kind" className="text-sm font-medium flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {t('type_label')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={kind} onValueChange={(value: any) => setKind(value)}>
                      <SelectTrigger className={cn(
                        "h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                        errors.kind && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}>
                        <SelectValue placeholder={t('type_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            {t('video')}
                          </div>
                        </SelectItem>
                        <SelectItem value="live">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {t('live')}
                          </div>
                        </SelectItem>
                        <SelectItem value="document">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('document')}
                          </div>
                        </SelectItem>
                        <SelectItem value="quiz">
                          <div className="flex items-center gap-2">
                            <Circle className="h-4 w-4" />
                            {t('quiz')}
                          </div>
                        </SelectItem>
                        <SelectItem value="assignment">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {t('assignment')}
                          </div>
                        </SelectItem>
                        <SelectItem value="whiteboard">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            {t('whiteboard')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.kind && <span className="text-xs text-destructive mt-1">{errors.kind}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-content-url" className="text-sm font-medium flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      {t('content_url_label')}
                    </Label>
                    <div className="flex gap-2">
                      <Select 
                        value={contentUrl} 
                        onValueChange={handleAttachmentChange}
                      >
                        <SelectTrigger className="h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all flex-1">
                          <SelectValue placeholder={gridT('selectAttachment')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(attachmentsLoading || storageLoading) ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                {gridT('loading_attachments')}
                              </div>
                            </SelectItem>
                          ) : (attachments.length === 0 && storageAttachments.length === 0) ? (
                            <SelectItem value="no-attachments" disabled>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <File className="h-4 w-4" />
                                {gridT('no_attachments_available')}
                              </div>
                            </SelectItem>
                          ) : (
                            <>
                              <SelectItem value="manual-url">
                                <div className="flex items-center gap-2">
                                  <Link className="h-4 w-4" />
                                  {gridT('no_attachment_manual_url')}
                                </div>
                              </SelectItem>
                              {storageAttachments.length > 0 && (
                                <>
                                  <SelectItem disabled value="storage-header">
                                    <div className="flex items-center gap-2 font-semibold text-primary">
                                      <HardDrive className="h-4 w-4" />
                                      My Storage
                                    </div>
                                  </SelectItem>
                                  {storageAttachments.map((attachment) => (
                                    <SelectItem key={`storage-${attachment.id}`} value={attachment.url || `attachment-${attachment.id}`}>
                                      <div className="flex items-center gap-2 pl-4">
                                        <File className="h-4 w-4" />
                                        <span className="truncate">{attachment.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                          ({attachment.size ? (attachment.size / 1024 / 1024).toFixed(1) : '0'}MB)
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {attachments.length > 0 && (
                                <>
                                  <SelectItem disabled value="course-header">
                                    <div className="flex items-center gap-2 font-semibold text-primary">
                                      <FileText className="h-4 w-4" />
                                      Course Files
                                    </div>
                                  </SelectItem>
                                  {attachments.map((attachment) => (
                                    <SelectItem key={`course-${attachment.id}`} value={attachment.url || `attachment-${attachment.id}`}>
                                      <div className="flex items-center gap-2 pl-4">
                                        <File className="h-4 w-4" />
                                        <span className="truncate">{attachment.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                          ({attachment.size ? (attachment.size / 1024 / 1024).toFixed(1) : '0'}MB)
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {/* Storage Dialog Button */}
                      {userData?.profile?.id && (
                        <StorageDialog ownerId={parseInt(userData.profile.id)}>
                          <Button 
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-12 px-3"
                            title="Open Storage"
                          >
                            <HardDrive className="h-4 w-4" />
                          </Button>
                        </StorageDialog>
                      )}
                    </div>
                    {errors.content_url && <span className="text-xs text-destructive mt-1">{errors.content_url}</span>}
                    
                    {/* Manual URL input when manual-url is selected */}
                    {contentUrl === 'manual-url' && (
                      <div className="mt-3 space-y-2">
                        <div className="relative">
                          <Input
                            type="url"
                            placeholder={t('content_url_placeholder')}
                            value={manualUrl}
                            onChange={(e) => setManualUrl(e.target.value)}
                            className="h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            maxLength={500}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-destructive">{errors.content_url || ''}</span>
                          <span className={cn(
                            "text-muted-foreground",
                            manualUrl.length > 450 && "text-orange-500",
                            manualUrl.length >= 500 && "text-destructive"
                          )}>{manualUrl.length}/500</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('content_url_description')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="px-8 py-2 border-t border-border/50">
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
              >
                {t('cancel_button')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !title.trim()}
                className="px-8 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    {gridT('updating')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {gridT('update')}
                  </div>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
