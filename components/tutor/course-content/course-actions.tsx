'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { 
  CourseStatus, 
  canEditCourse,
  getStatusRestrictionMessage 
} from '@/utils/course-status';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CourseActionsProps {
  courseId: number;
  courseStatus: CourseStatus;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
}

export default function CourseActions({ 
  courseId, 
  courseStatus, 
  onEdit, 
  onDelete, 
  onView,
  className = '' 
}: CourseActionsProps) {
  const t = useTranslations('CourseActions');
  
  const canEdit = canEditCourse(courseStatus);
  const restrictionMessage = getStatusRestrictionMessage(courseStatus);

  const EditButton = ({ children }: { children: React.ReactNode }) => {
    if (canEdit) {
      return <>{children}</>;
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {restrictionMessage}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className}`}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t('open_menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            {t('view')}
          </DropdownMenuItem>
        )}
        
        {(onEdit || onDelete) && onView && <DropdownMenuSeparator />}
        
        {onEdit && (
          <EditButton>
            <DropdownMenuItem 
              onClick={canEdit ? onEdit : undefined}
              disabled={!canEdit}
              className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('edit')}
            </DropdownMenuItem>
          </EditButton>
        )}
        
        {onDelete && (
          <EditButton>
            <DropdownMenuItem 
              onClick={canEdit ? onDelete : undefined}
              disabled={!canEdit}
              className={`${!canEdit ? 'opacity-50 cursor-not-allowed' : ''} text-destructive focus:text-destructive`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('delete')}
            </DropdownMenuItem>
          </EditButton>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
