'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, BookOpen, Clock, Users, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CreateCourseModule from './create-course-module';
import { useModuleByCourseId, useUpdateModule, useDeleteModule } from '@/hooks/course/use-course-module';
import { Module } from '@/interface/courses/module-interface';
import { courseModuleSchema } from '@/lib/validations/course-module';
import { CourseStatus } from '@/utils/course-status';
import { z } from 'zod';

// Extended interface for UI display
interface CourseModule extends Module {
  description?: string;
  lessonCount: number;
}

interface CourseModuleListProps {
  courseId: number;
  onModuleSelect?: (moduleId: number) => void;
  selectedModuleId?: number;
  courseStatus?: CourseStatus;
}

export default function CourseModuleList({ 
  courseId, 
  onModuleSelect,
  selectedModuleId,
  courseStatus = 'inactive'
}: CourseModuleListProps) {
  const t = useTranslations('CourseModuleList');
  const { toast } = useToast();
  const { data: rawModules = [], isLoading, error } = useModuleByCourseId(courseId);
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  
  // State for edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPosition, setEditPosition] = useState<number>(1);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  
  // State for delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingModule, setDeletingModule] = useState<Module | null>(null);
  
  // Transform API data to UI format
  const modules: CourseModule[] = useMemo(() => {
    return (rawModules as Module[]).map((module, index) => ({
      ...module,
      lessonCount: 5,
    }));
  }, [rawModules]);

  const handleModuleClick = (moduleId: number) => {
    onModuleSelect?.(moduleId);
  };

  const isEditDeleteDisabled = courseStatus === 'active' || courseStatus === 'pending' || courseStatus === 'ban';

  const handleEdit = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditDeleteDisabled) return;
    setEditingModule(module);
    setEditTitle(module.title);
    setEditPosition(module.position);
    setEditOpen(true);
  };

  const handleDelete = (module: Module, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditDeleteDisabled) return;
    setDeletingModule(module);
    setDeleteOpen(true);
  };

  const handleEditSubmit = async () => {
    
    if (!editingModule) {
      return;
    }
    
    try {
      // Zod validation
      const formData = {
        courseId,
        title: editTitle.trim(),
        position: editPosition
      };
      
      const moduleT = (key: string) => key; // Fallback translation function
      const schema = courseModuleSchema(moduleT);
      schema.parse(formData);
      setEditErrors({});
      
      const result = await updateModule.mutateAsync({
        courseId,
        moduleId: editingModule.id,
        body: { 
          title: editTitle.trim(),
          position: editPosition
        }
      });
      
      toast({
        title: t('success'),
        description: t('moduleUpdated'),
      });
      
      setEditOpen(false);
      setEditingModule(null);
      setEditTitle('');
      setEditPosition(1);
      setEditErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setEditErrors(newErrors);
      } else {
        toast({
          title: t('error'),
          description: t('updateError'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingModule) return;
    
    try {
      await deleteModule.mutateAsync({
        courseId,
        moduleId: deletingModule.id
      });
      
      toast({
        title: t('success'),
        description: t('moduleDeleted'),
      });
      
      setDeleteOpen(false);
      setDeletingModule(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('deleteError'),
        variant: 'destructive',
      });
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4 flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">{t('courseModules')}</h1>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
        
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 bg-transparent border-border">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <div className="flex items-center gap-4 mb-2">
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between mb-4 flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">{t('courseModules')}</h1>
        </div>
        {courseStatus === 'inactive' && (
          <CreateCourseModule courseId={courseId} courseStatus={courseStatus}/>
        )}
      </div>
      
      {modules.map((module) => (
        <div
          key={module.id}
          className={cn(
            "border rounded-lg transition-all duration-200",
            "border-border hover:border-primary/50",
            "hover:shadow-sm dark:hover:shadow-primary/10",
            selectedModuleId === module.id && "ring-2 ring-primary ring-opacity-50 border-primary"
          )}
        >
          <div
            className={cn(
              "p-4 cursor-pointer flex items-center justify-between",
              "hover:bg-accent/30 dark:hover:bg-accent/20 transition-colors duration-200"
            )}
            onClick={() => handleModuleClick(module.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground break-words">
                  {module.title}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isEditDeleteDisabled}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => handleEdit(module, e)}
                            disabled={isEditDeleteDisabled}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDelete(module, e)}
                            disabled={isEditDeleteDisabled}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TooltipTrigger>
                  {isEditDeleteDisabled && (
                    <TooltipContent>
                      <p>{t('activePendingCourseRestriction')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      ))}
      
      {!isLoading && modules.length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('noModulesFound')}</p>
        </div>
      )}
      
      {/* Edit Module Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('editModule')}</DialogTitle>
            <DialogDescription>
              {t('editModuleDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t('title')}
              </Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={cn(
                  "w-full",
                  editErrors.title && "border-destructive focus:border-destructive"
                )}
                placeholder={t('enterModuleTitle')}
              />
              {editErrors.title && (
                <span className="text-xs text-destructive">{editErrors.title}</span>
              )}
              <div className="text-xs text-muted-foreground">{editTitle.length}/100</div>
            </div>
            
            {/* Position Field */}
            <div className="space-y-2">
              <Label htmlFor="position">
                {t('position')}
              </Label>
              <Input
                id="position"
                type="number"
                min="1"
                max="100"
                value={editPosition}
                onChange={(e) => setEditPosition(Number(e.target.value))}
                className={cn(
                  "w-full",
                  editErrors.position && "border-destructive focus:border-destructive"
                )}
                placeholder={t('enterModulePosition')}
              />
              {editErrors.position && (
                <span className="text-xs text-destructive">{editErrors.position}</span>
              )}
              <div className="text-xs text-muted-foreground">{t('positionHint')}</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleEditSubmit}
              disabled={!editTitle.trim() || updateModule.isPending}
            >
              {updateModule.isPending ? t('updating') : t('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteModule')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteModuleConfirmation', { title: deletingModule?.title || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteModule.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteModule.isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}