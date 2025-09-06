'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Course, Module, Lesson } from '@/interface';
import { courseLessonSchema } from '@/lib/validations/course-lesson';
import { z } from 'zod';

// Mock data. In a real app, fetch this from your API.
const mockCourses: Pick<Course, 'public_id' | 'title'>[] = [
    { public_id: 'crs_1abc', title: 'Introduction to Next.js' },
    { public_id: 'crs_2def', title: 'Advanced TypeScript' },
];
// The 'course_id' in mockModules should be the 'public_id' of the course
const mockModules: (Pick<Module, 'public_id' | 'title'> & { course_public_id: string })[] = [
    { public_id: 'mod_1', course_public_id: 'crs_1abc', title: 'Module 1: Getting Started' },
    { public_id: 'mod_2', course_public_id: 'crs_1abc', title: 'Module 2: Pages and Routing' },
    { public_id: 'mod_3', course_public_id: 'crs_2def', title: 'Module 1: Types and Interfaces' },
    { public_id: 'mod_4', course_public_id: 'crs_2def', title: 'Module 2: Generics' },
];
const lessonKinds: Lesson['kind'][] = ['video', 'live', 'document', 'quiz', 'assignment', 'whiteboard'];

export default function CreateCourseLesson() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [kind, setKind] = useState<Lesson['kind']>(lessonKinds[0]);
    const [contentUrl, setContentUrl] = useState('');
    const [duration, setDuration] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [courses, setCourses] = useState<Pick<Course, 'public_id' | 'title'>[]>([]);
    const [modules, setModules] = useState<(Pick<Module, 'public_id' | 'title'> & { course_public_id: string })[]>([]);
    const [filteredModules, setFilteredModules] = useState<(Pick<Module, 'public_id' | 'title'> & { course_public_id: string })[]>([]);

    const t = useTranslations('CreateCourseLesson');

    useEffect(() => {
        // Mock fetching data
        setCourses(mockCourses);
        setModules(mockModules);
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            setFilteredModules(modules.filter(m => m.course_public_id === selectedCourse));
            setSelectedModule(''); // Reset module selection when course changes
        } else {
            setFilteredModules([]);
        }
    }, [selectedCourse, modules]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const formData = {
                courseId: selectedCourse,
                moduleId: selectedModule,
                title,
                kind,
                contentUrl,
                duration
            };
            
            courseLessonSchema.parse(formData);
            setErrors({});
            
            console.log({
                ...formData,
                duration_sec: duration,
            });
            
            // Reset form
            setTitle('');
            setSelectedCourse('');
            setSelectedModule('');
            setKind(lessonKinds[0]);
            setContentUrl('');
            setDuration(0);
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
                <Button variant="default">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('create_lesson_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('dialog_title')}</DialogTitle>
                        <DialogDescription>{t('dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                        {/* Course and Module Selection */}
                        <div className="flex w-full gap-2">
                            <div className="w-full">
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
                            <div className="w-full">
                                <Label htmlFor="module">
                                    {t('module_label')} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={selectedModule} onValueChange={setSelectedModule} disabled={!selectedCourse}>
                                    <SelectTrigger className={errors.moduleId ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('select_module_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredModules.map((module) => (
                                            <SelectItem key={module.public_id} value={module.public_id}>
                                                {module.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.moduleId && <span className="text-xs text-red-500">{errors.moduleId}</span>}
                            </div>
                        </div>

                        {/* Title */}
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

                        {/* Content URL */}
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="contentUrl">
                                {t('content_url_label')} <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                                type="url" 
                                id="contentUrl" 
                                placeholder={t('content_url_placeholder')} 
                                value={contentUrl} 
                                onChange={(e) => setContentUrl(e.target.value)} 
                                required 
                                className={errors.contentUrl ? 'border-red-500' : ''}
                            />
                            {errors.contentUrl && <span className="text-xs text-red-500">{errors.contentUrl}</span>}
                        </div>

                        {/* Kind and Duration Selection */}
                        <div className="flex w-full gap-2">
                            <div className="w-full">
                                <Label htmlFor="kind">
                                    {t('kind_label')} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={kind} onValueChange={(value) => setKind(value as Lesson['kind'])}>
                                    <SelectTrigger className={errors.kind ? 'border-red-500' : ''}>
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
                                {errors.kind && <span className="text-xs text-red-500">{errors.kind}</span>}
                            </div>
                            <div className="w-full">
                                <Label htmlFor="duration">
                                    {t('duration_label')} <span className="text-red-500">*</span>
                                </Label>
                                <Input 
                                    type="number" 
                                    id="duration" 
                                    placeholder={t('duration_placeholder')} 
                                    value={duration} 
                                    onChange={(e) => setDuration(Number(e.target.value))} 
                                    min="0" 
                                    required 
                                    className={errors.duration ? 'border-red-500' : ''}
                                />
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{t('duration_description')}</span>
                                    <span className="text-red-500">{errors.duration || ''}</span>
                                </div>
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