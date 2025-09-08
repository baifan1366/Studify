'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Clock, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { courseModuleSchema } from '@/lib/validations/course-module';
import { useCreateModule } from '@/hooks/course/use-course-module';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { canEditModules, getStatusRestrictionMessage, CourseStatus } from '@/utils/course-status';

interface CreateCourseModuleProps {
  courseId?: number;
  courseStatus?: CourseStatus;
}

export default function CreateCourseModule({ courseId, courseStatus }: CreateCourseModuleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [position, setPosition] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const t = useTranslations('CreateCourseModule');
    const moduleT = useTranslations('CourseModuleSchema');
    const createModuleMutation = useCreateModule();
    
    const isDisabled = !canEditModules(courseStatus || 'pending' as CourseStatus);
    const restrictionMessage = getStatusRestrictionMessage(courseStatus || 'pending' as CourseStatus);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!courseId) {
            setErrors({ courseId: t('course_id_required') });
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const formData = {
                courseId,
                title,
                position,
            };
            
            const schema = courseModuleSchema(moduleT);
            schema.parse(formData);
            setErrors({});
            
            const result = await createModuleMutation.mutateAsync(formData);
            
            // Reset form
            setTitle('');
            setPosition(1);
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
                    <Plus size={16} />
                    {t('create_module_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                                <BookOpen className="h-5 w-5 text-primary" />
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
                        {/* Title and Position Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
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
                                <Label htmlFor="position" className="text-sm font-medium">
                                    {t('position_label')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    id="position"
                                    placeholder="1"
                                    value={position}
                                    onChange={(e) => setPosition(Number(e.target.value))}
                                    min="1"
                                    max="100"
                                    required
                                    className={cn(
                                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary transition-colors",
                                        errors.position && "border-destructive focus:border-destructive"
                                    )}
                                />
                                {errors.position && <span className="text-xs text-destructive mt-1">{errors.position}</span>}
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
    );
}