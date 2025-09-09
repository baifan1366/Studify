'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Send, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { 
  CourseStatus, 
  getStatusDisplay, 
  getAvailableStatusTransitions, 
  canChangeStatus 
} from '@/utils/course-status';
import { useUpdateCourseStatus } from '@/hooks/course/use-course-status';

interface CourseStatusBadgeProps {
  courseId: number;
  currentStatus: CourseStatus;
  showActions?: boolean;
  className?: string;
}

export default function CourseStatusBadge({ 
  courseId, 
  currentStatus, 
  showActions = false,
  className = '' 
}: CourseStatusBadgeProps) {
  const t = useTranslations('CourseStatus');
  const updateStatusMutation = useUpdateCourseStatus();
  
  const statusDisplay = getStatusDisplay(currentStatus);
  const availableTransitions = getAvailableStatusTransitions(currentStatus);
  
  const handleStatusChange = async (newStatus: CourseStatus) => {
    if (!canChangeStatus(currentStatus, newStatus)) {
      return;
    }
    
    try {
      await updateStatusMutation.mutateAsync({
        courseId,
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update course status:', error);
    }
  };

  const getStatusIcon = (status: CourseStatus) => {
    switch (status) {
      case 'pending':
        return <Send className="h-3 w-3" />;
      case 'inactive':
        return <RotateCcw className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getActionLabel = (status: CourseStatus) => {
    switch (status) {
      case 'pending':
        return t('submit_for_approval');
      case 'inactive':
        return t('deactivate_course');
      default:
        return status;
    }
  };

  if (!showActions || availableTransitions.length === 0) {
    return (
      <Badge 
        variant="secondary" 
        className={`${statusDisplay.color} ${statusDisplay.bgColor} ${className}`}
      >
        {statusDisplay.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-auto p-1 ${className}`}
          disabled={updateStatusMutation.isPending}
        >
          <Badge 
            variant="secondary" 
            className={`${statusDisplay.color} ${statusDisplay.bgColor} mr-1`}
          >
            {statusDisplay.label}
          </Badge>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableTransitions.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className="flex items-center gap-2"
          >
            {getStatusIcon(status)}
            {getActionLabel(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
