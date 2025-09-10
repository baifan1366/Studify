'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, Clock, Eye, EyeOff, Link, FileText, Image, File, Circle, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Lesson } from '@/interface/courses/lesson-interface';
import { courseLessonSchema } from '@/lib/validations/course-lesson';
import { useCreateLesson } from '@/hooks/course/use-course-lesson';
import { useAttachments } from '@/hooks/course/use-attachments';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { canEditLessons, getStatusRestrictionMessage, CourseStatus } from '@/utils/course-status';

const lessonKinds: Lesson['kind'][] = ['video', 'live', 'document', 'quiz', 'assignment', 'whiteboard'];

interface CreateCourseLessonProps {
  courseId?: number;
  moduleId?: number;
  courseStatus?: CourseStatus;
}

export default function CreateCourseLesson({ courseId, moduleId, courseStatus }: CreateCourseLessonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [kind, setKind] = useState<Lesson['kind']>('video');
    const [contentUrl, setContentUrl] = useState('manual-url');
    const [manualUrl, setManualUrl] = useState('');
    const [durationSec, setDurationSec] = useState<number | undefined>();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const t = useTranslations('CreateCourseLesson');
    const lessonT = useTranslations('CourseLessonSchema');
    const createLessonMutation = useCreateLesson();
    
    // Fetch attachments for the current course owner
    const { data: attachments = [], isLoading: attachmentsLoading } = useAttachments(courseId);
    
    const isDisabled = !canEditLessons(courseStatus || 'pending' as CourseStatus);
    const restrictionMessage = getStatusRestrictionMessage(courseStatus || 'pending' as CourseStatus);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId || !moduleId) {
            setErrors({ 
                courseId: !courseId ? t('course_id_required') : '',
                moduleId: !moduleId ? t('module_id_required') : ''
            });
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Handle special select values
            let finalContentUrl: string | undefined;
            if (contentUrl === 'manual-url') {
                finalContentUrl = manualUrl || undefined;
            } else if (contentUrl === 'loading' || contentUrl === 'no-attachments') {
                finalContentUrl = undefined;
            } else {
                finalContentUrl = contentUrl || undefined;
            }
            
            const formData = {
                courseId,
                moduleId,
                title,
                kind,
                content_url: finalContentUrl,
                duration_sec: durationSec
            };
            
            const schema = courseLessonSchema(lessonT);
            schema.parse(formData);
            setErrors({});
            
            const result = await createLessonMutation.mutateAsync({
                courseId,
                moduleId,
                body: formData
            });
            
            // Reset form
            setTitle('');
            setKind('video');
            setContentUrl('manual-url');
            setManualUrl('');
            setDurationSec(undefined);
            setIsOpen(false);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                error.issues.forEach((err) => {
                    if (err.path[0]) {
                        newErrors[err.path[0].toString()] = err.message;
                    }
                });
                setErrors(newErrors);
            } 
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
                    if (!isDisabled) {
                        setIsOpen(open);
                    }
                }}>
            <DialogTrigger asChild>
                <Button 
                    variant="default"
                    disabled={isDisabled}
                    className={cn(
                        'flex items-center gap-2',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    title={isDisabled ? restrictionMessage : ''}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('create_lesson_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[95vh] bg-background text-foreground border-border overflow-auto">
                <form onSubmit={handleSubmit} className="h-full flex flex-col">
                    <DialogHeader className="px-8 pt-2 pb-2 border-b border-border/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                    {t('dialog_title')}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground mt-2 text-base">
                                    {t('dialog_description')}
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
                                        <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            {t('title_label')} <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            type="text"
                                            id="title"
                                            placeholder={t('title_placeholder')}
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className={cn(
                                                "h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                                                errors.title && "border-destructive focus:border-destructive focus:ring-destructive/20"
                                            )}
                                        />
                                        <div className="flex justify-between text-xs mt-1">
                                            <span className="text-destructive">{errors.title || ''}</span>
                                            <span className={cn(
                                                "text-muted-foreground",
                                                title.length > 90 && "text-orange-500",
                                                title.length >= 100 && "text-destructive"
                                            )}>{title.length}/100</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            {t('duration_label')}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                id="duration"
                                                placeholder={t('duration_placeholder')}
                                                value={durationSec || ''}
                                                onChange={(e) => setDurationSec(e.target.value ? Number(e.target.value) : undefined)}
                                                min="0"
                                                max="86400"
                                                className={cn(
                                                    "h-12 pl-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                                                    errors.duration_sec && "border-destructive focus:border-destructive focus:ring-destructive/20"
                                                )}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t('duration_description')}</p>
                                        {errors.duration_sec && <span className="text-xs text-destructive">{errors.duration_sec}</span>}
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
                                        <Label htmlFor="kind" className="text-sm font-medium flex items-center gap-2">
                                            <Play className="h-4 w-4" />
                                            {t('kind_label')} <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={kind} onValueChange={(value) => setKind(value as Lesson['kind'])}>
                                            <SelectTrigger className={cn(
                                                "h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                                                errors.kind && "border-destructive focus:border-destructive focus:ring-destructive/20"
                                            )}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {lessonKinds.map((k) => (
                                                    <SelectItem key={k} value={k}>
                                                        <div className="flex items-center gap-2">
                                                            {k === 'video' && <Play className="h-4 w-4" />}
                                                            {k === 'document' && <FileText className="h-4 w-4" />}
                                                            {k === 'quiz' && <Circle className="h-4 w-4" />}
                                                            {k === 'assignment' && <Star className="h-4 w-4" />}
                                                            {k === 'live' && <Eye className="h-4 w-4" />}
                                                            {k === 'whiteboard' && <Image className="h-4 w-4" />}
                                                            {t(`kinds.${k}`)}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.kind && <span className="text-xs text-destructive mt-1">{errors.kind}</span>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="contentUrl" className="text-sm font-medium flex items-center gap-2">
                                            <Link className="h-4 w-4" />
                                            {t('content_url_label')}
                                        </Label>
                                        <Select value={contentUrl} onValueChange={setContentUrl}>
                                            <SelectTrigger className={cn(
                                                "h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                                                errors.content_url && "border-destructive focus:border-destructive focus:ring-destructive/20"
                                            )}>
                                                <SelectValue placeholder={attachmentsLoading ? "Loading attachments..." : "Select an attachment"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {attachmentsLoading ? (
                                                    <SelectItem value="loading" disabled>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                                            {t('loading_attachments')}
                                                        </div>
                                                    </SelectItem>
                                                ) : attachments.length === 0 ? (
                                                    <SelectItem value="no-attachments" disabled>
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <File className="h-4 w-4" />
                                                            {t('no_attachments_available')}
                                                        </div>
                                                    </SelectItem>
                                                ) : (
                                                    <>
                                                        <SelectItem value="manual-url">
                                                            <div className="flex items-center gap-2">
                                                                <Link className="h-4 w-4" />
                                                                {t('no_attachment_manual_url')}
                                                            </div>
                                                        </SelectItem>
                                                        {attachments.map((attachment) => (
                                                            <SelectItem key={attachment.id} value={attachment.url || `attachment-${attachment.id}`}>
                                                                <div className="flex items-center gap-2">
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
                                            </SelectContent>
                                        </Select>
                                        {errors.content_url && <span className="text-xs text-destructive mt-1">{errors.content_url}</span>}
                                        
                                        {/* Manual URL input when no attachment is selected */}
                                        {contentUrl === 'manual-url' && (
                                            <div className="mt-3 space-y-2">
                                                <div className="relative">
                                                    <Input
                                                        type="url"
                                                        placeholder={t('content_url_placeholder')}
                                                        value={manualUrl}
                                                        onChange={(e) => setManualUrl(e.target.value)}
                                                        className="h-12 pl-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                    />
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
                                    onClick={() => setIsOpen(false)}
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
                                            {t('creating_button')}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {t('submit_button')}
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