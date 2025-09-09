'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseStatus, canChangeStatus } from '@/utils/course-status';
import { useUpdateCourseStatus } from '@/hooks/course/use-course-status';
import { useToast } from '@/hooks/use-toast';

interface SubmitForApprovalButtonProps {
  courseId: number;
  currentStatus: CourseStatus;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onSuccess?: () => void;
}

export default function SubmitForApprovalButton({ 
  courseId, 
  currentStatus,
  variant = 'default',
  size = 'sm',
  className = '',
  onSuccess
}: SubmitForApprovalButtonProps) {
  const t = useTranslations('CourseStatus');
  const { toast } = useToast();
  const updateStatusMutation = useUpdateCourseStatus();
  
  // Only show button if course can be submitted (inactive → pending)
  const canSubmit = canChangeStatus(currentStatus, 'pending');
  
  if (!canSubmit) {
    return null;
  }
  
  const handleSubmit = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        courseId,
        status: 'pending'
      });
      
      toast({
        title: t('submit_success_title'),
        description: t('submit_success_description'),
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: t('submit_error_title'),
        description: t('submit_error_description'),
        variant: 'destructive',
      });
      console.error('Failed to submit course for approval:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSubmit}
      disabled={updateStatusMutation.isPending}
      className={className}
    >
      <Send className="h-4 w-4 mr-2" />
      {updateStatusMutation.isPending ? t('submitting') : t('submit_for_approval')}
    </Button>
  );
}
