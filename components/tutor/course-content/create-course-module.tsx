'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Course } from '@/interface';
import { courseModuleSchema } from '@/lib/validations/course-module';
import { z } from 'zod';

// Mock course data. In a real application, you would fetch this from your API.
const mockCourses: Pick<Course, 'public_id' | 'title'>[] = [
    { public_id: 'crs_1abc', title: 'Introduction to Next.js' },
    { public_id: 'crs_2def', title: 'Advanced TypeScript' },
    { public_id: 'crs_3ghi', title: 'Database Design with SQL' },
];


export default function CreateCourseModule() {
    const [isOpen, setIsOpen] = useState(false);
    const [courses, setCourses] = useState<Pick<Course, 'public_id' | 'title'>[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [title, setTitle] = useState('');
    const [position, setPosition] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const t = useTranslations('CreateCourseModule');

    useEffect(() => {
        // Fetch courses when the component mounts
        // For now, we're using mock data
        setCourses(mockCourses);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const formData = {
                courseId: selectedCourse,
                title,
                position
            };
            
            courseModuleSchema.parse(formData);
            setErrors({});
            
            console.log(formData);
            
            // Reset form
            setSelectedCourse('');
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
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('create_module_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('dialog_title')}</DialogTitle>
                        <DialogDescription>{t('dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label htmlFor="course">
                                    {t('course_label')} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                    <SelectTrigger className={errors.courseId ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('select_course_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.public_id} value={course.public_id}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.courseId && <span className="text-xs text-red-500">{errors.courseId}</span>}
                            </div>
                            <div className="w-24">
                                <Label htmlFor="position">
                                    {t('position_label')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    id="position"
                                    placeholder={t('position_placeholder')}
                                    value={position}
                                    onChange={(e) => setPosition(Number(e.target.value))}
                                    min="1"
                                    max="100"
                                    required
                                    className={errors.position ? 'border-red-500' : ''}
                                />
                                {errors.position && <span className="text-xs text-red-500">{errors.position}</span>}
                            </div>
                        </div>
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('cancel_button')}</Button>
                        <Button type="submit">{t('submit_button')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}