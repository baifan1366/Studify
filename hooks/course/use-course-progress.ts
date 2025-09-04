import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

interface CourseProgress {
  lessonId: string;
  lessonTitle: string;
  lessonPosition: number;
  courseId: string;
  courseTitle: string;
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

export function useCourseProgress(courseId?: string, lessonId?: string) {
  return useQuery<CourseProgress | CourseProgress[]>({
    queryKey: ['course-progress', courseId, lessonId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (courseId) params.append('courseId', courseId);
      if (lessonId) params.append('lessonId', lessonId);
      
      const response = await apiGet<{ success: boolean; progress: CourseProgress | CourseProgress[] }>(
        `/api/course/progress?${params.toString()}`
      );
      return response.progress;
    },
    enabled: !!(courseId || lessonId),
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProgressResponse, Error, UpdateProgressData>({
    mutationFn: async (data) => {
      return apiSend<UpdateProgressResponse, UpdateProgressData>({
        url: '/api/course/progress',
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Update the specific lesson progress
      queryClient.invalidateQueries({ 
        queryKey: ['course-progress', undefined, variables.lessonId] 
      });
      
      // Update course-wide progress
      queryClient.invalidateQueries({ 
        queryKey: ['course-progress'] 
      });
      
      // Update course enrollment data
      queryClient.invalidateQueries({ 
        queryKey: ['course-enrollment'] 
      });
    },
    onError: (error) => {
      console.error('Progress update failed:', error);
    },
  });
}
