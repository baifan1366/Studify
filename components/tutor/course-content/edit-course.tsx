'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Edit, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { courseSchema } from '@/lib/validations/course';
import { z } from 'zod';
import { useUpdateCourse } from '@/hooks/course/use-courses';
import { useUser } from '@/hooks/profile/use-user';
import { useFormat } from '@/hooks/use-format';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/interface';

interface EditCourseProps {
    course: Course;
    children?: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function EditCourse({ course, children, isOpen: externalIsOpen, onOpenChange: externalOnOpenChange }: EditCourseProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    
    // Use external state if provided, otherwise use internal state
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
    const setIsOpen = externalOnOpenChange || setInternalIsOpen;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [slug, setSlug] = useState('');
    const [videoIntroUrl, setVideoIntroUrl] = useState('');
    const [requirements, setRequirements] = useState<string[]>([]);
    const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
    const [category, setCategory] = useState('');
    const [language, setLanguage] = useState('en');
    const [certificateTemplate, setCertificateTemplate] = useState('');
    const [autoCreateClassroom, setAutoCreateClassroom] = useState(true);
    const [autoCreateCommunity, setAutoCreateCommunity] = useState(true);
    const [visibility, setVisibility] = useState('private');
    const [priceCents, setPriceCents] = useState(0);
    const [currency, setCurrency] = useState('MYR');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
    const [isFree, setIsFree] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [requirementInput, setRequirementInput] = useState('');
    const [objectiveInput, setObjectiveInput] = useState('');
    const [totalLessons, setTotalLessons] = useState<number | undefined>();
    const [totalDurationMinutes, setTotalDurationMinutes] = useState<number | undefined>();
    const [errors, setErrors] = useState<Record<string, string>>({});

    const t = useTranslations('EditCourse');
    const courseT = useTranslations('CourseSchema');
    const { data: userData } = useUser();
    const updateCourseMutation = useUpdateCourse();
    const { formatPrice } = useFormat();
    const { toast } = useToast();

    // Initialize form with course data
    useEffect(() => {
        if (course) {
            setTitle(course.title || '');
            setDescription(course.description || '');
            setSlug(course.slug || '');
            setVideoIntroUrl(course.video_intro_url || '');
            setRequirements(course.requirements || []);
            setLearningObjectives(course.learning_objectives || []);
            setCategory(course.category || '');
            setLanguage(course.language || 'en');
            setCertificateTemplate(course.certificate_template || '');
            setAutoCreateClassroom(course.auto_create_classroom ?? true);
            setAutoCreateCommunity(course.auto_create_community ?? true);
            setVisibility(course.visibility || 'private');
            setPriceCents(course.price_cents || 0);
            setCurrency(course.currency || 'MYR');
            setThumbnailUrl(course.thumbnail_url || '');
            setLevel(course.level || 'beginner');
            setIsFree(course.is_free ?? false);
            setTags(course.tags || []);
            setTotalLessons(course.total_lessons);
            setTotalDurationMinutes(course.total_duration_minutes);
        }
    }, [course]);

    // Helper functions for managing arrays
    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const addRequirement = () => {
        if (requirementInput.trim() && !requirements.includes(requirementInput.trim())) {
            setRequirements([...requirements, requirementInput.trim()]);
            setRequirementInput('');
        }
    };

    const removeRequirement = (reqToRemove: string) => {
        setRequirements(requirements.filter(req => req !== reqToRemove));
    };

    const addObjective = () => {
        if (objectiveInput.trim() && !learningObjectives.includes(objectiveInput.trim())) {
            setLearningObjectives([...learningObjectives, objectiveInput.trim()]);
            setObjectiveInput('');
        }
    };

    const removeObjective = (objToRemove: string) => {
        setLearningObjectives(learningObjectives.filter(obj => obj !== objToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const formData = {
                title,
                description,
                slug,
                video_intro_url: videoIntroUrl,
                requirements,
                learning_objectives: learningObjectives,
                category,
                language,
                certificate_template: certificateTemplate,
                auto_create_classroom: autoCreateClassroom,
                auto_create_community: autoCreateCommunity,
                visibility: visibility as 'public' | 'private' | 'unlisted',
                price_cents: priceCents,
                currency,
                thumbnail_url: thumbnailUrl,
                level,
                is_free: isFree,
                tags: tags,
                total_lessons: totalLessons,
                total_duration_minutes: totalDurationMinutes
            };
            
            const schema = courseSchema(courseT);
            schema.parse(formData);
            setErrors({});
            
            // Update the course
            await updateCourseMutation.mutateAsync({
                id: course.public_id as string,
                ...formData
            });
            
            toast({
                title: t('success_title'),
                description: t('success_description'),
            });
            
            setIsOpen(false);
        } catch (error) {
            console.error('Course update error:', error);
            if (error instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                error.issues.forEach((err) => {
                    if (err.path[0]) {
                        newErrors[err.path[0].toString()] = err.message;
                    }
                });
                setErrors(newErrors);
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Failed to update course. Please try again.';
                setErrors({ general: errorMessage });
                toast({
                    title: t('error_title'),
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* Only render DialogTrigger when using internal state (not externally controlled) */}
            {externalIsOpen === undefined && (
                <DialogTrigger asChild>
                    {children || (
                        <Button variant="default" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            {t('edit_course_button')}
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-background border-border">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{t('dialog_title')}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">{t('dialog_description')}</DialogDescription>
                    </DialogHeader>
                    {errors.general && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
                            <p className="text-sm text-destructive">{errors.general}</p>
                        </div>
                    )}
                    <div className="grid gap-6 py-4">
                        {/* Basic Information */}
                        <Card className="bg-transparent border-border py-2">
                            <CardHeader>
                                <CardTitle className="text-lg text-card-foreground">{t('basic_information')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="title" className="text-foreground">
                                        {t('course_title')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        id="title"
                                        placeholder={t('title_placeholder')}
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className={`bg-background border-input text-foreground ${errors.title ? 'border-destructive' : ''}`}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-destructive">{errors.title || ''}</span>
                                        <span className="text-muted-foreground">{title.length}/100</span>
                                    </div>
                                </div>

                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="description" className="text-foreground">
                                        {t('description')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder={t('description_placeholder')}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                        className={`bg-background border-input text-foreground ${errors.description ? 'border-destructive' : ''}`}
                                        rows={3}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-destructive">{errors.description || ''}</span>
                                        <span className="text-muted-foreground">{description.length}/500</span>
                                    </div>
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="slug" className="text-foreground">
                                        {t('course_slug')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        id="slug"
                                        placeholder="course-url-slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                        required
                                        className={`bg-background border-input text-foreground ${errors.slug ? 'border-destructive' : ''}`}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('slug_description')}
                                    </p>
                                    {errors.slug && <span className="text-xs text-destructive">{errors.slug}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="category" className="text-foreground">{t('category')}</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger className="bg-background border-input text-foreground">
                                                <SelectValue placeholder={t('select_category')} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border">
                                                <SelectItem value="programming">{t('programming')}</SelectItem>
                                                <SelectItem value="design">{t('design')}</SelectItem>
                                                <SelectItem value="business">{t('business')}</SelectItem>
                                                <SelectItem value="marketing">{t('marketing')}</SelectItem>
                                                <SelectItem value="data-science">{t('data_science')}</SelectItem>
                                                <SelectItem value="languages">{t('languages')}</SelectItem>
                                                <SelectItem value="other">{t('other')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.category && <span className="text-xs text-destructive">{errors.category}</span>}
                                    </div>

                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="level" className="text-foreground">{t('difficulty_level')}</Label>
                                        <Select value={level} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setLevel(value)}>
                                            <SelectTrigger className="bg-background border-input text-foreground">
                                                <SelectValue placeholder={t('select_level')} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border">
                                                <SelectItem value="beginner">{t('beginner')}</SelectItem>
                                                <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
                                                <SelectItem value="advanced">{t('advanced')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.level && <span className="text-xs text-destructive">{errors.level}</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="language" className="text-foreground">{t('language')}</Label>
                                        <Select value={language} onValueChange={setLanguage}>
                                            <SelectTrigger className="bg-background border-input text-foreground">
                                                <SelectValue placeholder={t('select_language')} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border">
                                                <SelectItem value="en">{t('english')}</SelectItem>
                                                <SelectItem value="es">{t('spanish')}</SelectItem>
                                                <SelectItem value="fr">{t('french')}</SelectItem>
                                                <SelectItem value="de">{t('german')}</SelectItem>
                                                <SelectItem value="zh">{t('chinese')}</SelectItem>
                                                <SelectItem value="ja">{t('japanese')}</SelectItem>
                                                <SelectItem value="ms">{t('malay')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.language && <span className="text-xs text-destructive">{errors.language}</span>}
                                    </div>

                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="visibility" className="text-foreground">{t('visibility')}</Label>
                                        <Select value={visibility} onValueChange={setVisibility}>
                                            <SelectTrigger className="bg-background border-input text-foreground">
                                                <SelectValue placeholder={t('select_visibility')} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border">
                                                <SelectItem value="public">{t('public')}</SelectItem>
                                                <SelectItem value="private">{t('private')}</SelectItem>
                                                <SelectItem value="unlisted">{t('unlisted')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.visibility && <span className="text-xs text-destructive">{errors.visibility}</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Course Content */}
                        <Card className="bg-transparent py-2 border-border">
                            <CardHeader>
                                <CardTitle className="text-lg text-card-foreground">{t('course_content')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="video_intro_url" className="text-foreground">{t('intro_video_url')}</Label>
                                    <Input
                                        type="url"
                                        id="video_intro_url"
                                        placeholder={t('intro_video_placeholder')}
                                        value={videoIntroUrl}
                                        onChange={(e) => setVideoIntroUrl(e.target.value)}
                                        className={`bg-background border-input text-foreground ${errors.video_intro_url ? 'border-destructive' : ''}`}
                                    />
                                    {errors.video_intro_url && <span className="text-xs text-destructive">{errors.video_intro_url}</span>}
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="thumbnail_url" className="text-foreground">{t('thumbnail_url')}</Label>
                                    <Input
                                        type="url"
                                        id="thumbnail_url"
                                        placeholder={t('thumbnail_placeholder')}
                                        value={thumbnailUrl}
                                        onChange={(e) => setThumbnailUrl(e.target.value)}
                                        className={`bg-background border-input text-foreground ${errors.thumbnail_url ? 'border-destructive' : ''}`}
                                    />
                                    {errors.thumbnail_url && <span className="text-xs text-destructive">{errors.thumbnail_url}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="total_lessons" className="text-foreground">{t('total_lessons')}</Label>
                                        <Input
                                            type="number"
                                            id="total_lessons"
                                            placeholder="0"
                                            min="1"
                                            value={totalLessons || ''}
                                            onChange={(e) => setTotalLessons(e.target.value ? parseInt(e.target.value) : undefined)}
                                            className={`bg-background border-input text-foreground ${errors.total_lessons ? 'border-destructive' : ''}`}
                                        />
                                        {errors.total_lessons && <span className="text-xs text-destructive">{errors.total_lessons}</span>}
                                    </div>

                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="total_duration_minutes" className="text-foreground">{t('total_duration_minutes')}</Label>
                                        <Input
                                            type="number"
                                            id="total_duration_minutes"
                                            placeholder="0"
                                            min="1"
                                            value={totalDurationMinutes || ''}
                                            onChange={(e) => setTotalDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                                            className={`bg-background border-input text-foreground ${errors.total_duration_minutes ? 'border-destructive' : ''}`}
                                        />
                                        {errors.total_duration_minutes && <span className="text-xs text-destructive">{errors.total_duration_minutes}</span>}
                                    </div>
                                </div>

                                {/* Requirements */}
                                <div className="grid w-full gap-1.5">
                                    <Label className="text-foreground">{t('course_requirements')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('add_requirement')}
                                            value={requirementInput}
                                            onChange={(e) => setRequirementInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                                            className="bg-background border-input text-foreground"
                                        />
                                        <Button type="button" onClick={addRequirement} size="sm" variant="default">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {requirements.map((req, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
                                                {req}
                                                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeRequirement(req)} />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Learning Objectives */}
                                <div className="grid w-full gap-1.5">
                                    <Label className="text-foreground">{t('learning_objectives')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('add_learning_objective')}
                                            value={objectiveInput}
                                            onChange={(e) => setObjectiveInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                                            className="bg-background border-input text-foreground"
                                        />
                                        <Button type="button" onClick={addObjective} size="sm" variant="default">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {learningObjectives.map((obj, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
                                                {obj}
                                                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeObjective(obj)} />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="grid w-full gap-1.5">
                                    <Label className="text-foreground">{t('tags')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('add_tag')}
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            className="bg-background border-input text-foreground"
                                        />
                                        <Button type="button" onClick={addTag} size="sm" variant="default">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
                                                {tag}
                                                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)} />
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {t('tags_count')}: {tags.length}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pricing & Settings */}
                        <Card className="bg-transparent py-2 border-border">
                            <CardHeader>
                                <CardTitle className="text-lg text-card-foreground">{t('pricing_settings')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_free"
                                        checked={isFree}
                                        onChange={(e) => setIsFree(e.target.checked)}
                                        className="border-input"
                                    />
                                    <Label htmlFor="is_free" className="text-foreground">{t('free_course')}</Label>
                                </div>

                                {!isFree && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="price_cents" className="text-foreground">{t('price_cents')}</Label>
                                            <Input
                                                type="number"
                                                id="price_cents"
                                                placeholder="0"
                                                min="1"
                                                value={priceCents}
                                                onChange={(e) => setPriceCents(parseInt(e.target.value) || 0)}
                                                className={`bg-background border-input text-foreground ${errors.price_cents ? 'border-destructive' : ''}`}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('price_in_cents_example', { price: formatPrice(2999, currency, false) })}
                                            </p>
                                            {errors.price_cents && <span className="text-xs text-destructive">{errors.price_cents}</span>}
                                        </div>

                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="currency" className="text-foreground">{t('currency')}</Label>
                                            <Select value={currency} onValueChange={setCurrency}>
                                                <SelectTrigger className="bg-background border-input text-foreground">
                                                    <SelectValue placeholder={t('select_currency')} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border">
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="GBP">GBP</SelectItem>
                                                    <SelectItem value="MYR">MYR</SelectItem>
                                                    <SelectItem value="SGD">SGD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.currency && <span className="text-xs text-destructive">{errors.currency}</span>}
                                        </div>
                                    </div>
                                )}

                                <Separator className="bg-border" />

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="auto_create_classroom"
                                            checked={autoCreateClassroom}
                                            onChange={(e) => setAutoCreateClassroom(e.target.checked)}
                                            className="border-input"
                                        />
                                        <Label htmlFor="auto_create_classroom" className="text-foreground">{t('auto_create_classroom')}</Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="auto_create_community"
                                            checked={autoCreateCommunity}
                                            onChange={(e) => setAutoCreateCommunity(e.target.checked)}
                                            className="border-input"
                                        />
                                        <Label htmlFor="auto_create_community" className="text-foreground">{t('auto_create_community')}</Label>
                                    </div>
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="certificate_template" className="text-foreground">{t('certificate_template')}</Label>
                                    <Input
                                        type="text"
                                        id="certificate_template"
                                        placeholder={t('certificate_placeholder')}
                                        value={certificateTemplate}
                                        onChange={(e) => setCertificateTemplate(e.target.value)}
                                        className={`bg-background border-input text-foreground ${errors.certificate_template ? 'border-destructive' : ''}`}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-destructive">{errors.certificate_template || ''}</span>
                                        <span className="text-muted-foreground">{certificateTemplate.length}/255</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                    <DialogFooter className="bg-background border-t border-border pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={updateCourseMutation.isPending} className="text-muted-foreground hover:text-foreground">
                            {t('cancel_button')}
                        </Button>
                        <Button type="submit" variant="default" disabled={updateCourseMutation.isPending}>
                            {updateCourseMutation.isPending ? t('updating') : t('update_button')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}