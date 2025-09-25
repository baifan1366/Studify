'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateClassroom } from '@/hooks/classroom/use-create-classroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl'

export function CreateClassroomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
  });
  const t = useTranslations('TutorClassroom')
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
        description: t('classroom_name_required'),
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createClassroomMutation.mutateAsync(formData);
      toast({
        title: t('success'),
        description: t('classroom_created_success', { name: result.classroom.name }),
      });
      router.push(`/tutor/classroom/${result.classroom.slug}`);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('failed_to_create_classroom'),
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
        <h1 className="text-3xl font-bold tracking-tight">{t('create_new_classroom')}</h1>
        <p className="text-muted-foreground">
          {t('setup_new_classroom_desc')}
        </p>
      </div>

      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>{t('classroom_details')}</CardTitle>
          <CardDescription>
            {t('provide_basic_info')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('classroom_name')} *</Label>
              <Input
                id="name"
                placeholder={t('enter_classroom_name')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                placeholder={t('describe_classroom_optional')}
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
                  <SelectValue placeholder={t('select_visibility')} />
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
                    {t('create_classroom')}
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
          <p>• {t('unique_class_code_generated')}</p>
          <p>• {t('automatically_set_as_owner')}</p>
          <p>• {t('can_start_creating_content')}</p>
          <p>• {t('students_can_join_with_code')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
