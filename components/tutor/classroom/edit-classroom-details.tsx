'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2, Save, X } from 'lucide-react';
import { useUpdateClassroom, useDeleteClassroom, useClassroomDetails } from '@/hooks/tutor-classroom/use-classroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EditClassroomDetailsProps {
  classroomSlug: string;
  onCancel?: () => void;
}

export default function EditClassroomDetails({ classroomSlug, onCancel }: EditClassroomDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('EditClassroomDetails');
  const { data: classroomDetails, isLoading } = useClassroomDetails(classroomSlug);
  const updateClassroom = useUpdateClassroom(classroomSlug);
  const deleteClassroom = useDeleteClassroom(classroomSlug);

  const [formData, setFormData] = useState({
    name: classroomDetails?.name || '',
    description: classroomDetails?.description || '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Update form data when classroom details load
  React.useEffect(() => {
    if (classroomDetails) {
      setFormData({
        name: classroomDetails.name,
        description: classroomDetails.description || '',
      });
    }
  }, [classroomDetails]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t('name_required');
    } else if (formData.name.trim().length < 3) {
      newErrors.name = t('name_min_length');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await updateClassroom.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      toast({
        title: t('success'),
        description: t('classroom_updated_success'),
      });

      // Navigate back to classroom details or call onCancel
      if (onCancel) {
        onCancel();
      } else {
        router.push(`/tutor/classroom/${classroomSlug}`);
      }
    } catch (error) {
      console.error('Error updating classroom:', error);
      toast({
        title: t('error'),
        description: t('update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClassroom.mutateAsync();

      toast({
        title: t('success'),
        description: t('classroom_deleted_success'),
      });

      // Navigate back to classrooms list
      router.push('/tutor/classroom');
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast({
        title: t('error'),
        description: t('delete_failed'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!classroomDetails) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('classroom_not_found')}</CardTitle>
            <CardDescription>{t('classroom_not_found_desc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if user has permission to edit (must be owner)
  const isOwner = classroomDetails.userMembership?.role === 'owner';
  
  if (!isOwner) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('access_denied')}</CardTitle>
            <CardDescription>{t('owner_only_edit')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('edit_classroom')}</CardTitle>
          <CardDescription>
            {t('edit_classroom_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('classroom_name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('enter_classroom_name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('enter_description_optional')}
                rows={4}
              />
            </div>

            <div className="flex justify-between items-center pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={deleteClassroom.isPending}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete_classroom')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('delete_classroom_warning', { name: classroomDetails.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel || (() => router.push(`/tutor/classroom/${classroomSlug}`))}
                  disabled={updateClassroom.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={updateClassroom.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateClassroom.isPending ? t('saving') : t('save_changes')}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}