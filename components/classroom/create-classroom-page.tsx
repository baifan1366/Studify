'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { useCreateClassroom } from '@/hooks/classroom/use-create-classroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function CreateClassroomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('CreateClassroom');
  const { data: currentUser } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const createClassroomMutation = useCreateClassroom();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: t('error'),
        description: t('name_required'),
        variant: "destructive",
      });
      return;
    }

    if (formData.visibility === 'private' && !formData.password.trim()) {
      toast({
        title: t('error'),
        description: t('password_required'),
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createClassroomMutation.mutateAsync(formData);
      toast({
        title: t('success'),
        description: t('classroom_created', { name: result.classroom.name }),
      });
      const isTutor = currentUser?.profile?.role === 'tutor';
      const route = isTutor 
        ? `/tutor/classroom/${result.classroom.slug}`
        : `/classroom/${result.classroom.slug}`;
      router.push(route);
    } catch (error: any) {
      console.error('Classroom creation error:', error);
      toast({
        title: t('error'),
        description: error.message || t('failed_to_create'),
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back_to_classrooms')}
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t('page_title')}</h1>
        <p className="text-muted-foreground">
          {t('page_subtitle')}
        </p>
      </div>

      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>{t('classroom_details')}</CardTitle>
          <CardDescription>
            {t('classroom_details_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('classroom_name_required')}</Label>
              <Input
                id="name"
                placeholder={t('classroom_name_placeholder')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('classroom_description')}</Label>
              <Textarea
                id="description"
                placeholder={t('classroom_description_placeholder')}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">{t('visibility')}</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => handleInputChange('visibility', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('visibility')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex flex-col">
                      <span>{t('public')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('public_desc')}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex flex-col">
                      <span>{t('private')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('private_desc')}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.visibility === 'private' && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('classroom_password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('classroom_password_placeholder')}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10"
                    required={formData.visibility === 'private'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('password_help')}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={handleBack}>
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createClassroomMutation.isPending || !formData.name.trim()}
              >
                {createClassroomMutation.isPending ? (
                  <>{t('creating')}</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('create_button')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('what_happens_next')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• {t('next_step_1')}</p>
          <p>• {t('next_step_2')}</p>
          <p>• {t('next_step_3')}</p>
          <p>• {t('next_step_4')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
