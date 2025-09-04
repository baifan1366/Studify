'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { courseSchema } from '@/lib/validations/course';
import { z } from 'zod';
import { useCreateCourse } from '@/hooks/course/use-courses';
import { useUser } from '@/hooks/profile/use-user';

export default function CreateCourse() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [tags, setTags] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const t = useTranslations('CreateCourse');
    const { data: userData } = useUser();
    const createCourseMutation = useCreateCourse();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check if user is authenticated
        if (!userData?.user?.id) {
            console.log('User is not authenticated', userData, userData?.user);
            setErrors({ general: 'You must be logged in to create a course' });
            return;
        }
        
        try {
            const formData = {
                title,
                description,
                isPublic,
                tags
            };
            
            courseSchema.parse(formData);
            setErrors({});
            
            // Prepare the payload for the API
            const coursePayload = {
                title,
                description,
                visibility: isPublic ? 'public' as const : 'private' as const,
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
                owner_id: parseInt(userData.user.id)
            };
            
            // Use the mutation to create the course
            await createCourseMutation.mutateAsync(coursePayload);
            
            // Reset form fields on success
            setTitle('');
            setDescription('');
            setIsPublic(true);
            setTags('');
            setIsOpen(false); // Close the dialog on submit
        } catch (error) {
            if (error instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                error.issues.forEach((err) => {
                    if (err.path[0]) {
                        newErrors[err.path[0].toString()] = err.message;
                    }
                });
                setErrors(newErrors);
            } else {
                // Handle API errors
                setErrors({ general: 'Failed to create course. Please try again.' });
            }
        }
    };

    return(
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="default">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('create_course_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('dialog_title')}</DialogTitle>
                        <DialogDescription>{t('dialog_description')}</DialogDescription>
                    </DialogHeader>
                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <p className="text-sm text-red-600">{errors.general}</p>
                        </div>
                    )}
                    <div className="grid gap-2 py-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="title">
                                {t('title_label')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="text"
                                id="title"
                                placeholder={t('title_placeholder')}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className={errors.title ? 'border-red-500' : ''}
                            />
                            <div className="flex justify-between text-xs">
                                <span className="text-red-500">{errors.title || ''}</span>
                                <span className="text-muted-foreground">{title.length}/100 characters</span>
                            </div>
                        </div>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="description">
                                {t('description_label')} <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="description"
                                placeholder={t('description_placeholder')}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                className={errors.description ? 'border-red-500' : ''}
                            />
                            <div className="flex justify-between text-xs">
                                <span className="text-red-500">{errors.description || ''}</span>
                                <span className="text-muted-foreground">{description.length}/500 characters</span>
                            </div>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="tags">{t('tags_label')}</Label>
                            <Input
                                type="text"
                                id="tags"
                                placeholder={t('tags_placeholder')}
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                             <p className="text-sm text-muted-foreground">
                                {t('tags_description')}
                             </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="visibility"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            <Label
                                htmlFor="visibility"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {t('public_checkbox_label')}
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={createCourseMutation.isPending}>
                            {t('cancel_button')}
                        </Button>
                        <Button type="submit" disabled={createCourseMutation.isPending}>
                            {createCourseMutation.isPending ? 'Creating...' : t('submit_button')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}