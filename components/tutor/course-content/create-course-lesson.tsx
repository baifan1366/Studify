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
import { Plus, Play, Clock, Eye, EyeOff, Link, FileText, Image, File } from 'lucide-react';
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
    const [contentUrl, setContentUrl] = useState('');
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
            const formData = {
                courseId,
                moduleId,
                title,
                kind,
                content_url: contentUrl || undefined,
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
            setContentUrl('');
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
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] border-0 shadow-2xl overflow-hidden">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                                <Play className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">{t('dialog_title')}</DialogTitle>
                                <DialogDescription className="text-muted-foreground mt-1">
                                    {t('dialog_description')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="px-6 py-4 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="title" className="text-sm font-medium">
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
                                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary transition-colors",
                                        errors.title && "border-destructive focus:border-destructive"
                                    )}
                                />
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="text-destructive">{errors.title || ''}</span>
                                    <span className="text-muted-foreground">{title.length}/100</span>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="duration" className="text-sm font-medium">
                                    {t('duration_label')}
                                </Label>
                                <div className="relative mt-1.5">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        id="duration"
                                        placeholder={t('duration_placeholder')}
                                        value={durationSec || ''}
                                        onChange={(e) => setDurationSec(e.target.value ? Number(e.target.value) : undefined)}
                                        min="0"
                                        max="86400"
                                        className={cn(
                                            "pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors",
                                            errors.duration_sec && "border-destructive focus:border-destructive"
                                        )}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{t('duration_description')}</p>
                                {errors.duration_sec && <span className="text-xs text-destructive">{errors.duration_sec}</span>}
                            </div>
                        </div>
                            
                        {/* Kind and Duration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:grid-cols-1">
                                <Label htmlFor="kind" className="text-sm font-medium">
                                    {t('kind_label')} <span className="text-destructive">*</span>
                                </Label>
                                <Select value={kind} onValueChange={(value) => setKind(value as Lesson['kind'])}>
                                    <SelectTrigger className={cn(
                                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary transition-colors",
                                        errors.kind && "border-destructive focus:border-destructive"
                                    )}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lessonKinds.map((k) => (
                                            <SelectItem key={k} value={k}>
                                                {t(`kinds.${k}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.kind && <span className="text-xs text-destructive mt-1">{errors.kind}</span>}
                            </div>
                            <div className="md:grid-cols-3">
                                <Label htmlFor="contentUrl" className="text-sm font-medium">
                                    {t('content_url_label')}
                                </Label>
                                <Select value={contentUrl} onValueChange={setContentUrl}>
                                    <SelectTrigger className={cn(
                                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary transition-colors",
                                        errors.content_url && "border-destructive focus:border-destructive"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <File className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder={attachmentsLoading ? "Loading attachments..." : "Select an attachment"} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {attachmentsLoading ? (
                                            <SelectItem value="" disabled>Loading attachments...</SelectItem>
                                        ) : attachments.length === 0 ? (
                                            <SelectItem value="" disabled>No attachments available</SelectItem>
                                        ) : (
                                            <>
                                                <SelectItem value="">No attachment (manual URL)</SelectItem>
                                                {attachments.map((attachment) => (
                                                    <SelectItem key={attachment.id} value={attachment.url || ""}>
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
                                {contentUrl === '' && (
                                    <div className="mt-2">
                                        <div className="relative">
                                            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="url"
                                                placeholder={t('content_url_placeholder')}
                                                onChange={(e) => setContentUrl(e.target.value)}
                                                className="pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Or enter a manual URL</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter className="px-6 pb-6 pt-2">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setIsOpen(false)}
                        >
                            {t('cancel_button')}
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('creating_button') : t('submit_button')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}