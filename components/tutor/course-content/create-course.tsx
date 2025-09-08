'use client';

import React, { useState } from 'react';
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
import { Plus, X, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { courseSchema } from '@/lib/validations/course';
import { z } from 'zod';
import { useCreateCourse } from '@/hooks/course/use-courses';
import { useUser } from '@/hooks/profile/use-user';
import { useFormat } from '@/hooks/use-format';

export default function CreateCourse() {
    const [isOpen, setIsOpen] = useState(false);
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

    const t = useTranslations('CreateCourse');
    const courseT = useTranslations('CourseSchema');
    const { data: userData } = useUser();
    const createCourseMutation = useCreateCourse();
    const { formatPrice } = useFormat();

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
        
        // Check if user is authenticated and has profile
        if (!userData?.profile?.id) {
            setErrors({ general: 'You must be logged in to create a course' });
            return;
        }
        
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
            
            // Prepare the payload for the API
            const ownerId: number = parseInt(userData.profile?.id) || (typeof userData.id === 'string' ? parseInt(userData.id) : userData.id || 0);
            
            const coursePayload = {
                title,
                description,
                slug,
                video_intro_url: videoIntroUrl || undefined,
                requirements,
                learning_objectives: learningObjectives,
                category,
                language,
                certificate_template: certificateTemplate || undefined,
                auto_create_classroom: autoCreateClassroom,
                auto_create_community: autoCreateCommunity,
                visibility: visibility as 'public' | 'private' | 'unlisted',
                price_cents: isFree ? 0 : priceCents,
                currency,
                thumbnail_url: thumbnailUrl || undefined,
                level,
                is_free: isFree,
                tags: tags,
                total_lessons: totalLessons,
                total_duration_minutes: totalDurationMinutes,
                owner_id: ownerId
            };
            
            // Use the mutation to create the course
            await createCourseMutation.mutateAsync(coursePayload);
            
            // Reset form fields on success
            setTitle('');
            setDescription('');
            setSlug('');
            setVideoIntroUrl('');
            setRequirements([]);
            setLearningObjectives([]);
            setCategory('');
            setLanguage('en');
            setCertificateTemplate('');
            setAutoCreateClassroom(true);
            setAutoCreateCommunity(true);
            setVisibility('private');
            setPriceCents(0);
            setCurrency('MYR');
            setThumbnailUrl('');
            setLevel('beginner');
            setIsFree(false);
            setTotalLessons(undefined);
            setTotalDurationMinutes(undefined);
            setRequirementInput('');
            setObjectiveInput('');
            setTags([]);
            setTagInput('');
            setIsOpen(false); // Close the dialog on submit
        } catch (error) {
            console.error('Course creation error:', error);
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
                const errorMessage = error instanceof Error ? error.message : 'Failed to create course. Please try again.';
                setErrors({ general: errorMessage });
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
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
                    <div className="grid gap-6 py-4">
                        {/* Basic Information */}
                        <Card className="bg-transparent py-2">
                            <CardHeader>
                                <CardTitle className="text-lg">{t('basic_information')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="title">
                                        {t('course_title')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        id="title"
                                        placeholder="Enter course title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className={errors.title ? 'border-red-500' : ''}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-red-500">{errors.title || ''}</span>
                                        <span className="text-muted-foreground">{title.length}/100</span>
                                    </div>
                                </div>

                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="description">
                                        {t('description')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe what students will learn in this course"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                        className={errors.description ? 'border-red-500' : ''}
                                        rows={3}
                                    />
                                    <div className="flex justify-between text-xs">
                                        <span className="text-red-500">{errors.description || ''}</span>
                                        <span className="text-muted-foreground">{description.length}/500</span>
                                    </div>
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="slug">
                                        {t('course_slug')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        id="slug"
                                        placeholder="course-url-slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                        required
                                        className={errors.slug ? 'border-red-500' : ''}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('slug_description')} {/** This will be used in the course URL. Only lowercase letters, numbers, and hyphens allowed*/}
                                    </p>
                                    {errors.slug && <span className="text-xs text-red-500">{errors.slug}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="category">{t('category')}</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('select_category')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="programming">{t('programming')}</SelectItem>
                                                <SelectItem value="design">{t('design')}</SelectItem>
                                                <SelectItem value="business">{t('business')}</SelectItem>
                                                <SelectItem value="marketing">{t('marketing')}</SelectItem>
                                                <SelectItem value="data-science">{t('data_science')}</SelectItem>
                                                <SelectItem value="languages">{t('languages')}</SelectItem>
                                                <SelectItem value="other">{t('other')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.category && <span className="text-xs text-red-500">{errors.category}</span>}
                                    </div>

                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="level">{t('difficulty_level')}</Label>
                                        <Select value={level} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setLevel(value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('select_level')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="beginner">{t('beginner')}</SelectItem>
                                                <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
                                                <SelectItem value="advanced">{t('advanced')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.level && <span className="text-xs text-red-500">{errors.level}</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="language">{t('language')}</Label>
                                        <Select value={language} onValueChange={setLanguage}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('select_language')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="en">{t('english')}</SelectItem>
                                                <SelectItem value="es">{t('spanish')}</SelectItem>
                                                <SelectItem value="fr">{t('french')}</SelectItem>
                                                <SelectItem value="de">{t('german')}</SelectItem>
                                                <SelectItem value="zh">{t('chinese')}</SelectItem>
                                                <SelectItem value="ja">{t('japanese')}</SelectItem>
                                                <SelectItem value="ms">{t('malay')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.language && <span className="text-xs text-red-500">{errors.language}</span>}
                                    </div>

                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="visibility">{t('visibility')}</Label>
                                        <Select value={visibility} onValueChange={setVisibility}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('select_visibility')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="public">{t('public')}</SelectItem>
                                                <SelectItem value="private">{t('private')}</SelectItem>
                                                <SelectItem value="unlisted">{t('unlisted')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.visibility && <span className="text-xs text-red-500">{errors.visibility}</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Course Content */}
                        <Card className="bg-transparent py-2">
                            <CardHeader>
                                <CardTitle className="text-lg">{t('course_content')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="video_intro_url">{t('intro_video_url')}</Label>
                                    <Input
                                        type="url"
                                        id="video_intro_url"
                                        placeholder={t('intro_video_placeholder')}
                                        value={videoIntroUrl}
                                        onChange={(e) => setVideoIntroUrl(e.target.value)}
                                        className={errors.video_intro_url ? 'border-red-500' : ''}
                                    />
                                    {errors.video_intro_url && <span className="text-xs text-red-500">{errors.video_intro_url}</span>}
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="thumbnail_url">{t('thumbnail_url')}</Label>
                                    <Input
                                        type="url"
                                        id="thumbnail_url"
                                        placeholder={t('thumbnail_placeholder')}
                                        value={thumbnailUrl}
                                        onChange={(e) => setThumbnailUrl(e.target.value)}
                                        className={errors.thumbnail_url ? 'border-red-500' : ''}
                                    />
                                    {errors.thumbnail_url && <span className="text-xs text-red-500">{errors.thumbnail_url}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="total_lessons">{t('total_lessons')}</Label>
                                        <Input
                                            type="number"
                                            id="total_lessons"
                                            placeholder="0"
                                            min="1"
                                            value={totalLessons || ''}
                                            onChange={(e) => setTotalLessons(e.target.value ? parseInt(e.target.value) : undefined)}
                                            className={errors.total_lessons ? 'border-red-500' : ''}
                                        />
                                        {errors.total_lessons && <span className="text-xs text-red-500">{errors.total_lessons}</span>}
                                    </div>

                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="total_duration_minutes">{t('total_duration_minutes')}</Label>
                                        <Input
                                            type="number"
                                            id="total_duration_minutes"
                                            placeholder="0"
                                            min="1"
                                            value={totalDurationMinutes || ''}
                                            onChange={(e) => setTotalDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                                            className={errors.total_duration_minutes ? 'border-red-500' : ''}
                                        />
                                        {errors.total_duration_minutes && <span className="text-xs text-red-500">{errors.total_duration_minutes}</span>}
                                    </div>
                                </div>

                                {/* Requirements */}
                                <div className="grid w-full gap-1.5">
                                    <Label>{t('course_requirements')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('add_requirement')}
                                            value={requirementInput}
                                            onChange={(e) => setRequirementInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                                        />
                                        <Button type="button" onClick={addRequirement} size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {requirements.map((req, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {req}
                                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeRequirement(req)} />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Learning Objectives */}
                                <div className="grid w-full gap-1.5">
                                    <Label>{t('learning_objectives')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('add_learning_objective')}
                                            value={objectiveInput}
                                            onChange={(e) => setObjectiveInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                                        />
                                        <Button type="button" onClick={addObjective} size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {learningObjectives.map((obj, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {obj}
                                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeObjective(obj)} />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="grid w-full gap-1.5">
                                    <Label>{t('tags')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('add_tag')}
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        />
                                        <Button type="button" onClick={addTag} size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {tag}
                                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pricing & Settings */}
                        <Card className="bg-transparent py-2">
                            <CardHeader>
                                <CardTitle className="text-lg">{t('pricing_settings')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_free"
                                        checked={isFree}
                                        onChange={(e) => setIsFree(e.target.checked)}
                                    />
                                    <Label htmlFor="is_free">{t('free_course')}</Label>
                                </div>

                                {!isFree && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="price_cents">{t('price_cents')}</Label>
                                            <Input
                                                type="number"
                                                id="price_cents"
                                                placeholder="0"
                                                min="1"
                                                value={priceCents}
                                                onChange={(e) => setPriceCents(parseInt(e.target.value) || 0)}
                                                className={errors.price_cents ? 'border-red-500' : ''}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('price_in_cents_example', { price: formatPrice(2999, currency, false) })}
                                            </p>
                                            {errors.price_cents && <span className="text-xs text-red-500">{errors.price_cents}</span>}
                                        </div>

                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="currency">{t('currency')}</Label>
                                            <Select value={currency} onValueChange={setCurrency}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('select_currency')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="GBP">GBP</SelectItem>
                                                    <SelectItem value="MYR">MYR</SelectItem>
                                                    <SelectItem value="SGD">SGD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.currency && <span className="text-xs text-red-500">{errors.currency}</span>}
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="auto_create_classroom"
                                            checked={autoCreateClassroom}
                                            onChange={(e) => setAutoCreateClassroom(e.target.checked)}
                                        />
                                        <Label htmlFor="auto_create_classroom">{t('auto_create_classroom')}</Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="auto_create_community"
                                            checked={autoCreateCommunity}
                                            onChange={(e) => setAutoCreateCommunity(e.target.checked)}
                                        />
                                        <Label htmlFor="auto_create_community">{t('auto_create_community')}</Label>
                                    </div>
                                </div>

                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="certificate_template">{t('certificate_template')}</Label>
                                    <Input
                                        type="text"
                                        id="certificate_template"
                                        placeholder={t('certificate_placeholder')}
                                        value={certificateTemplate}
                                        onChange={(e) => setCertificateTemplate(e.target.value)}
                                        className={errors.certificate_template ? 'border-red-500' : ''}
                                    />
                                    {errors.certificate_template && <span className="text-xs text-red-500">{errors.certificate_template}</span>}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={createCourseMutation.isPending}>
                            {t('cancel_button')}
                        </Button>
                        <Button type="submit" disabled={createCourseMutation.isPending}>
                            {createCourseMutation.isPending ? t('creating') : t('submit_button')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
