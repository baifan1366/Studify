import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Types
export interface LearningProgress {
  id: number;
  public_id: string;
  user_id: number;
  lesson_id: number;
  state: 'not_started' | 'in_progress' | 'completed';
  progress_pct: number;
  video_position_sec: number;
  video_duration_sec: number;
  time_spent_sec: number;
  lesson_kind: string;
  last_accessed_at: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningProgressWithLesson extends LearningProgress {
  lesson: {
    public_id: string;
    title: string;
    kind: string;
    content_url: string;
    duration_sec: number;
    position?: number;
    module: {
      title: string;
      position: number;
      course: {
        id?: number;
        slug: string;
        title?: string;
        thumbnail_url?: string;
      };
    };
  };
}

export interface ContinueWatchingItem {
  lesson_public_id: string;
  lesson_title: string;
  course_slug: string;
  course_title: string;
  course_thumbnail: string;
  module_title: string;
  progress_pct: number;
  video_position_sec: number;
  video_duration_sec: number;
  last_accessed_at: string;
}

export interface UpdateProgressArgs {
  lessonId: string;
  progressPct?: number;
  videoPositionSec?: number;
  videoDurationSec?: number;
  timeSpentSec?: number;
  state?: 'not_started' | 'in_progress' | 'completed';
  lessonKind?: string;
}

export interface UpdateVideoPositionArgs {
  lessonId: string;
  videoPositionSec: number;
  videoDurationSec?: number;
  progressPct?: number;
}

// Hook to get lesson progress
export function useLessonProgress(lessonId: string) {
  return useQuery({
    queryKey: ['learning-progress', 'lesson', lessonId],
    queryFn: async (): Promise<LearningProgressWithLesson | null> => {
      if (!lessonId) return null;
      
      const response = await api.get(`/learning-progress?lessonId=${lessonId}`);
      return response.data.data;
    },
    enabled: !!lessonId,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to get course progress
export function useCourseProgress(courseSlug: string) {
  return useQuery({
    queryKey: ['learning-progress', 'course', courseSlug],
    queryFn: async (): Promise<LearningProgressWithLesson[]> => {
      if (!courseSlug) return [];
      
      const response = await api.get(`/learning-progress?courseSlug=${courseSlug}`);
      return response.data.data || [];
    },
    enabled: !!courseSlug,
    staleTime: 60000, // 1 minute
  });
}

// Hook to get continue watching items
export function useContinueWatching() {
  return useQuery({
    queryKey: ['learning-progress', 'continue-watching'],
    queryFn: async (): Promise<ContinueWatchingItem[]> => {
      const response = await api.get('/learning-progress?type=continue-watching');
      return response.data.data || [];
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Hook to update learning progress
export function useUpdateLearningProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (args: UpdateProgressArgs): Promise<LearningProgress> => {
      const response = await api.post('/learning-progress', args);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['learning-progress', 'lesson', variables.lessonId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['learning-progress', 'continue-watching'] 
      });
      
      // Update course progress cache if we can determine the course
      queryClient.invalidateQueries({ 
        queryKey: ['learning-progress', 'course'] 
      });
      
      // Show success message for completion
      if (variables.state === 'completed') {
        toast({
          title: 'Lesson Completed! 🎉',
          description: 'Great job! You have completed this lesson.',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update learning progress:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save your progress. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Hook to update video position (lightweight updates during playback)
export function useUpdateVideoPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdateVideoPositionArgs): Promise<LearningProgress> => {
      const response = await api.put('/learning-progress', args);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Update the lesson progress cache optimistically
      queryClient.setQueryData(
        ['learning-progress', 'lesson', variables.lessonId],
        (oldData: LearningProgressWithLesson | null) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            video_position_sec: variables.videoPositionSec,
            video_duration_sec: variables.videoDurationSec || oldData.video_duration_sec,
            progress_pct: variables.progressPct || oldData.progress_pct,
            last_accessed_at: new Date().toISOString(),
          };
        }
      );
      
      // Update continue watching cache
      queryClient.invalidateQueries({ 
        queryKey: ['learning-progress', 'continue-watching'] 
      });
    },
    onError: (error) => {
      console.error('Failed to update video position:', error);
      // Don't show toast for video position updates as they happen frequently
    },
  });
}

// Helper hook to track video progress automatically
export function useVideoProgressTracker(
  lessonId: string,
  options: {
    updateInterval?: number; // How often to save position (in seconds)
    autoSave?: boolean;
  } = {}
) {
  const { updateInterval = 10, autoSave = true } = options;
  const updatePosition = useUpdateVideoPosition();
  const updateProgress = useUpdateLearningProgress();
  
  let lastUpdateTime = 0;
  let lastSavedPosition = 0;
  
  const trackProgress = (
    currentTime: number,
    duration: number,
    force: boolean = false
  ) => {
    if (!lessonId || !autoSave) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = (now - lastUpdateTime) / 1000;
    const positionDifference = Math.abs(currentTime - lastSavedPosition);
    
    // Only update if enough time has passed or position changed significantly
    if (force || (timeSinceLastUpdate >= updateInterval && positionDifference >= 5)) {
      const progressPct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
      
      updatePosition.mutate({
        lessonId,
        videoPositionSec: Math.floor(currentTime),
        videoDurationSec: Math.floor(duration),
        progressPct,
      });
      
      lastUpdateTime = now;
      lastSavedPosition = currentTime;
    }
  };
  
  const markAsStarted = () => {
    updateProgress.mutate({
      lessonId,
      state: 'in_progress',
      progressPct: 1,
      lessonKind: 'video',
    });
  };
  
  const markAsCompleted = (duration: number) => {
    updateProgress.mutate({
      lessonId,
      state: 'completed',
      progressPct: 100,
      videoPositionSec: Math.floor(duration),
      videoDurationSec: Math.floor(duration),
      lessonKind: 'video',
    });
  };
  
  return {
    trackProgress,
    markAsStarted,
    markAsCompleted,
    isUpdating: updatePosition.isPending || updateProgress.isPending,
  };
}

// Hook for continue watching actions
export function useContinueWatchingActions() {
  const generateContinueWatchingUrl = (item: ContinueWatchingItem): string => {
    return `/course/${item.course_slug}/learn?lesson=${item.lesson_public_id}&t=${item.video_position_sec}`;
  };
  
  const formatProgress = (progressPct: number): string => {
    return `${Math.round(progressPct)}%`;
  };
  
  const formatTimeRemaining = (progressPct: number, videoDurationSec: number): string => {
    const remainingSeconds = (videoDurationSec * (100 - progressPct)) / 100;
    const minutes = Math.ceil(remainingSeconds / 60);
    
    if (minutes < 60) {
      return `${minutes}min left`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      return `${hours}h ${remainingMins}m left`;
    }
  };
  
  const formatLastAccessed = (lastAccessedAt: string): string => {
    const now = new Date();
    const accessed = new Date(lastAccessedAt);
    const diffInHours = (now.getTime() - accessed.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };
  
  return {
    generateContinueWatchingUrl,
    formatProgress,
    formatTimeRemaining,
    formatLastAccessed,
  };
}
