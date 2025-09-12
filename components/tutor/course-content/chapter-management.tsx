'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Clock, List, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { Chapter } from '@/interface/courses/chapter-interface';
import { 
  useChapters, 
  useCreateChapter, 
  useUpdateChapter, 
  useDeleteChapter 
} from '@/hooks/course/use-course-chapter';
import { 
  courseChapterSchema, 
  CourseChapterInput 
} from '@/lib/validations/course-chapter';
import { cn } from '@/lib/utils';

interface ChapterManagementProps {
  lessonId: number;
  ownerId?: number;
  className?: string;
  children?: React.ReactNode;
}

type ChapterFormData = CourseChapterInput;

export default function ChapterManagement({ 
  lessonId, 
  ownerId, 
  className,
  children 
}: ChapterManagementProps) {
  const t = useTranslations('ChapterManagement');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch chapters
  const { data: chapters = [], isLoading, refetch } = useChapters(lessonId, ownerId);

  // Mutations
  const createChapterMutation = useCreateChapter();
  const updateChapterMutation = useUpdateChapter();
  const deleteChapterMutation = useDeleteChapter();

  // Form state
  const [formData, setFormData] = useState<CourseChapterInput>({
    title: '',
    description: '',
    start_time_sec: undefined,
    end_time_sec: undefined,
    order_index: 1,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format time display
  const formatTime = (seconds?: number): string => {
    if (seconds === undefined) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Validate form data
  const validateForm = (data: CourseChapterInput): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    try {
      courseChapterSchema.parse(data);
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
      }
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingChapter) {
        await updateChapterMutation.mutateAsync({
          lessonId,
          chapterId: editingChapter.id,
          ownerId,
          ...formData
        });
      } else {
        await createChapterMutation.mutateAsync({
          lessonId,
          ownerId,
          ...formData
        });
      }
      
      handleCloseDialog();
      refetch();
    } catch (error) {
      console.error('Error saving chapter:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingChapter) return;
    
    try {
      await deleteChapterMutation.mutateAsync({
        lessonId,
        chapterId: deletingChapter.id,
        ownerId
      });
      
      setDeletingChapter(null);
      refetch();
    } catch (error) {
      console.error('Error deleting chapter:', error);
    }
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingChapter(null);
    setFormData({
      title: '',
      description: '',
      start_time_sec: undefined,
      end_time_sec: undefined,
      order_index: chapters.length + 1,
    });
    setFormErrors({});
  };

  // Handle edit
  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      title: chapter.title,
      description: chapter.description || '',
      start_time_sec: chapter.start_time_sec,
      end_time_sec: chapter.end_time_sec,
      order_index: chapter.order_index || 1,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    setEditingChapter(null);
    setFormData({
      title: '',
      description: '',
      start_time_sec: undefined,
      end_time_sec: undefined,
      order_index: chapters.length + 1,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // Sort chapters by order_index
  const sortedChapters = [...chapters].sort((a, b) => 
    (a.order_index || 0) - (b.order_index || 0)
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with toggle and create button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 p-2 h-auto"
        >
          <List className="h-4 w-4" />
          <span className="font-medium">{t('manage_chapters')}</span>
          <Badge variant="secondary" className="ml-2">
            {t('chapter_count', { 
              count: chapters.length, 
              plural: chapters.length !== 1 ? 's' : '' 
            })}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {children || (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleCreateNew}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('add_new_chapter')}
              </Button>
            </DialogTrigger>
          </Dialog>
        )}
      </div>

      {/* Expandable chapters list */}
      {isExpanded && (
        <div className="bg-background border rounded-lg p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedChapters.length === 0 ? (
            <div className="text-center py-8">
              <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('no_chapters')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('no_chapters_description')}
              </p>
              <Button 
                variant="default" 
                onClick={handleCreateNew}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('create_chapter')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        #{chapter.order_index || 1}
                      </Badge>
                      <h4 className="font-medium text-foreground">
                        {chapter.title}
                      </h4>
                    </div>
                    
                    {chapter.description && (
                      <p className="text-sm text-muted-foreground">
                        {chapter.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {(chapter.start_time_sec !== undefined || chapter.end_time_sec !== undefined) && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatTime(chapter.start_time_sec)} - {formatTime(chapter.end_time_sec)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(chapter)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      {t('edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingChapter(chapter)}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t('delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? t('edit_chapter') : t('create_chapter')}
            </DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Chapter Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                {t('chapter_details')}
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="title">{t('chapter_title')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('chapter_title_placeholder')}
                  className={formErrors.title ? 'border-destructive' : ''}
                />
                {formErrors.title && (
                  <p className="text-xs text-destructive">{formErrors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('chapter_description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('chapter_description_placeholder')}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">{t('order_index')}</Label>
                <Input
                  id="order_index"
                  type="number"
                  min="1"
                  value={formData.order_index}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                  placeholder={t('order_index_placeholder')}
                  className={formErrors.order_index ? 'border-destructive' : ''}
                />
                {formErrors.order_index && (
                  <p className="text-xs text-destructive">{formErrors.order_index}</p>
                )}
              </div>
            </div>

            {/* Timing Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                {t('timing_info')} <span className="text-muted-foreground">({t('optional_fields')})</span>
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_time_sec">{t('start_time')}</Label>
                  <Input
                    id="start_time_sec"
                    type="number"
                    min="0"
                    value={formData.start_time_sec || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      start_time_sec: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder={t('start_time_placeholder')}
                    className={formErrors.start_time_sec ? 'border-destructive' : ''}
                  />
                  {formErrors.start_time_sec && (
                    <p className="text-xs text-destructive">{formErrors.start_time_sec}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time_sec">{t('end_time')}</Label>
                  <Input
                    id="end_time_sec"
                    type="number"
                    min="0"
                    value={formData.end_time_sec || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      end_time_sec: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder={t('end_time_placeholder')}
                    className={formErrors.end_time_sec ? 'border-destructive' : ''}
                  />
                  {formErrors.end_time_sec && (
                    <p className="text-xs text-destructive">{formErrors.end_time_sec}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('saving') : t('save_chapter')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingChapter} 
        onOpenChange={(open) => !open && setDeletingChapter(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_chapter')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_confirmation')} <strong>{deletingChapter?.title}</strong>
              <br />
              <br />
              {t('delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChapterMutation.isPending}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteChapterMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapterMutation.isPending ? t('deleting') : t('confirm_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
