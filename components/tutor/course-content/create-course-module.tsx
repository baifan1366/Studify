'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Course } from '@/interface';

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

    const t = useTranslations('CreateCourseModule');

    useEffect(() => {
        // Fetch courses when the component mounts
        // For now, we're using mock data
        setCourses(mockCourses);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) {
            alert(t('course_selection_error'));
            return;
        }
        console.log({
            courseId: selectedCourse,
            title,
            position,
        });
        // Reset form
        setSelectedCourse('');
        setTitle('');
        setPosition(1);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('create_module_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('dialog_title')}</DialogTitle>
                        <DialogDescription>{t('dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="course">{t('course_label')}</Label>
                            <select
                                id="course"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="" disabled>{t('select_course_placeholder')}</option>
                                {courses.map((course) => (
                                    <option key={course.public_id} value={course.public_id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="title">{t('title_label')}</Label>
                            <Input
                                type="text"
                                id="title"
                                placeholder={t('title_placeholder')}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="position">{t('position_label')}</Label>
                            <Input
                                type="number"
                                id="position"
                                placeholder={t('position_placeholder')}
                                value={position}
                                onChange={(e) => setPosition(Number(e.target.value))}
                                min="1"
                                required
                            />
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