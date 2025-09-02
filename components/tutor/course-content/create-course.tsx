'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CreateCourse() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [tags, setTags] = useState('');

    const t = useTranslations('CreateCourse');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically handle the form submission,
        // for example, by sending the data to your API.
        console.log({
            title,
            description,
            isPublic,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        });
        // Reset form fields
        setTitle('');
        setDescription('');
        setIsPublic(true);
        setTags('');
        setIsOpen(false); // Close the dialog on submit
    };

    return(
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {t('create_course_button')}
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
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="description">{t('description_label')}</Label>
                            <Textarea
                                id="description"
                                placeholder={t('description_placeholder')}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
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
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('cancel_button')}</Button>
                        <Button type="submit">{t('submit_button')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}