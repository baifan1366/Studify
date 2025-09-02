'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Course, Module, Lesson } from '@/interface';

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
        if (!selectedCourse || !selectedModule) {
            alert(t('selection_error'));
            return;
        }
        console.log({
            courseId: selectedCourse,
            moduleId: selectedModule,
            title,
            kind,
            contentUrl,
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
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('create_lesson_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('dialog_title')}</DialogTitle>
                        <DialogDescription>{t('dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Course Selection */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="course">{t('course_label')}</Label>
                            <select id="course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                                <option value="" disabled>{t('select_course_placeholder')}</option>
                                {courses.map((course) => (
                                    <option key={course.public_id} value={course.public_id}>{course.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Module Selection */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="module">{t('module_label')}</Label>
                            <select id="module" value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required disabled={!selectedCourse}>
                                <option value="" disabled>{t('select_module_placeholder')}</option>
                                {filteredModules.map((module) => (
                                    <option key={module.public_id} value={module.public_id}>{module.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="title">{t('title_label')}</Label>
                            <Input type="text" id="title" placeholder={t('title_placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>

                        {/* Kind Selection */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="kind">{t('kind_label')}</Label>
                            <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Lesson['kind'])} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                                {lessonKinds.map((k) => (
                                    <option key={k} value={k}>{t(`kinds.${k}`)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Content URL */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="contentUrl">{t('content_url_label')}</Label>
                            <Input type="url" id="contentUrl" placeholder={t('content_url_placeholder')} value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} required />
                        </div>

                        {/* Duration */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="duration">{t('duration_label')}</Label>
                            <Input type="number" id="duration" placeholder={t('duration_placeholder')} value={duration} onChange={(e) => setDuration(Number(e.target.value))} min="0" required />
                             <p className="text-sm text-muted-foreground">{t('duration_description')}</p>
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