import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, courseProgressApi } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface CourseProgress {
  lessonId: string;
  lessonTitle: string;
  lessonPosition: number;
  courseId?: string;
  courseTitle?: string;
  state: 'not_started' | 'in_progress' | 'completed';
  progressPct: number;
  lastSeenAt: string;
  timeSpentSec: number;
  completionDate?: string;
}

interface UpdateProgressData {
  lessonId: string;
  progressPct: number;
  timeSpentSec?: number;
  state?: string;
  videoPositionSec?: number;
  videoDurationSec?: number;
}

interface UpdateProgressResponse {
  success: boolean;
  progress: {
    lessonId: string;
    state: string;
    progressPct: number;
    lastSeenAt: string;
    timeSpentSec: number;
  };
}

// Hook to get course progress (either by courseId or all progress)
export function useCourseProgress(courseId?: string) {
  return useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      const url = courseId 
        ? `${courseProgressApi.list}?courseId=${courseId}`
        : courseProgressApi.list;
      
      const response = await api.get(url);
      return response.data.progress as CourseProgress[];
    },
    enabled: true,
    staleTime: 30000, // 30 seconds - progress data doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
  });
}

// Hook to update course progress
export function useUpdateCourseProgress() {
  const queryClient = useQueryClient();
  const t = useTranslations('CourseLearning');

  return useMutation({
    mutationFn: async (data: UpdateProgressData) => {
      const response = await api.post(courseProgressApi.create, data);
      return response.data as UpdateProgressResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress-lesson', variables.lessonId] });
      
      // Show success message based on progress
      if (data.progress.progressPct >= 100) {
        toast.success(t('lesson_completed'));
      } else {
        toast.success(t('progress_updated'));
      }
    },
    onError: (error: any) => {
      console.error('Failed to update course progress:', error);
      toast.error(t('progress_update_failed'));
    },
  });
}

// Hook to get course progress by progress ID
export function useCourseProgressByProgressId(progressId: string) {
  return useQuery({
    queryKey: ['course-progress-id', progressId],
    queryFn: async () => {
      const response = await api.get(courseProgressApi.getByProgressId(progressId));
      return response.data as CourseProgress;
    },
    enabled: !!progressId,
  });
}

// Hook to get course progress by lesson ID
export function useCourseProgressByLessonId(lessonId: string) {
  return useQuery({
    queryKey: ['course-progress-lesson', lessonId],
    queryFn: async () => {
      const response = await api.get(courseProgressApi.getByLessonId(lessonId));
      return response.data as CourseProgress;
    },
    enabled: !!lessonId,
    staleTime: 30000, // 30 seconds - progress data doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
  });
}

// Hook to update course progress by lesson ID (PATCH)
export function useUpdateCourseProgressByLessonId() {
  const queryClient = useQueryClient();
  const t = useTranslations('CourseLearning');

  return useMutation({
    mutationFn: async ({ lessonId, ...data }: UpdateProgressData) => {
      const response = await api.patch(courseProgressApi.updateByLessonId(lessonId), data);
      return response.data as UpdateProgressResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress-lesson', variables.lessonId] });
      
      // Show success message based on progress
      if (data.progress.progressPct >= 100) {
        toast.success(t('lesson_completed'));
      } else {
        toast.success(t('progress_updated'));
      }
    },
    onError: (error: any) => {
      console.error('Failed to update course progress by lesson ID:', error);
      toast.error(t('progress_update_failed'));
    },
  });
}

// Hook to update course progress by progress ID (PATCH)
export function useUpdateCourseProgressByProgressId() {
  const queryClient = useQueryClient();
  const t = useTranslations('CourseLearning');

  return useMutation({
    mutationFn: async ({ progressId, ...data }: { progressId: string; progressPct: number; timeSpentSec?: number }) => {
      const response = await api.patch(courseProgressApi.updateByProgressId(progressId), data);
      return response.data as UpdateProgressResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress-id', variables.progressId] });
      
      // Show success message based on progress
      if (data.progress.progressPct >= 100) {
        toast.success(t('lesson_completed'));
      } else {
        toast.success(t('progress_updated'));
      }
    },
    onError: (error: any) => {
      console.error('Failed to update course progress by progress ID:', error);
      toast.error(t('progress_update_failed'));
    },
  });
}

// Hook to update course progress state
export function useUpdateCourseProgressstate() {
  const queryClient = useQueryClient();
  const t = useTranslations('CourseLearning');

  return useMutation({
    mutationFn: async ({ progressId, state }: { progressId: string; state: 'not_started' | 'in_progress' | 'completed' }) => {
      const response = await api.patch(courseProgressApi.updateState(progressId), { state: state });
      return response.data as UpdateProgressResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress-id', variables.progressId] });
      
      toast.success(t('progress_state_updated'));
    },
    onError: (error: any) => {
      console.error('Failed to update course progress state:', error);
      toast.error(t('progress_state_update_failed'));
    },
  });
}
