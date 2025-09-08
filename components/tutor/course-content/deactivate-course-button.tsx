'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseStatus, canChangeStatus } from '@/utils/course-status';
import { useUpdateCourseStatus } from '@/hooks/course/use-course-status';
import { useToast } from '@/hooks/use-toast';

interface DeactivateCourseButtonProps {
  courseId: number;
  currentStatus: CourseStatus;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onSuccess?: () => void;
}

export default function DeactivateCourseButton({ 
  courseId, 
  currentStatus,
  variant = 'outline',
  size = 'sm',
  className = '',
  onSuccess
}: DeactivateCourseButtonProps) {
  const t = useTranslations('CourseStatus');
  const toast = useToast();
  const updateStatusMutation = useUpdateCourseStatus();
  
  // Only show button if course can be deactivated (active → inactive)
  const canDeactivate = canChangeStatus(currentStatus, 'inactive');
  
  if (!canDeactivate) {
    return null;
  }
  
  const handleDeactivate = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        courseId,
        status: 'inactive'
      });
      
      toast({
        title: t('deactivate_success_title'),
        description: t('deactivate_success_description'),
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: t('deactivate_error_title'),
        description: t('deactivate_error_description'),
        variant: 'destructive',
      });
      console.error('Failed to deactivate course:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDeactivate}
      disabled={updateStatusMutation.isPending}
      className={className}
    >
      <RotateCcw className="h-4 w-4 mr-2" />
      {updateStatusMutation.isPending ? t('deactivating') : t('deactivate_course')}
    </Button>
  );
}
