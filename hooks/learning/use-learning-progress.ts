import React from 'react';
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
      
      const response = await api.get(`/api/learning-progress?lessonId=${lessonId}`);
      return response.data.data;
    },
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce API calls
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

// Hook to get course progress
export function useCourseProgress(courseSlug: string) {
  return useQuery({
    queryKey: ['learning-progress', 'course', courseSlug],
    queryFn: async (): Promise<LearningProgressWithLesson[]> => {
      if (!courseSlug) return [];
      
      const response = await api.get(`/api/learning-progress?courseSlug=${courseSlug}`);
      return response.data.data || [];
    },
    enabled: !!courseSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce API calls
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

// Hook to get continue watching items
export function useContinueWatching() {
  return useQuery({
    queryKey: ['learning-progress', 'continue-watching'],
    queryFn: async (): Promise<ContinueWatchingItem[]> => {
      const response = await api.get('/api/learning-progress?type=continue-watching');
      return response.data.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
  });
}

// Hook to update learning progress
export function useUpdateLearningProgress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (args: UpdateProgressArgs): Promise<LearningProgress> => {
      const response = await api.post('/api/learning-progress', args);
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
      const response = await api.put('/api/learning-progress', args);
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
  
  // Use refs to persist values across re-renders
  const lastUpdateTimeRef = React.useRef(0);
  const lastSavedPositionRef = React.useRef(0);
  
  // Store updatePosition in ref to avoid recreating trackProgress callback
  const updatePositionRef = React.useRef(updatePosition);
  updatePositionRef.current = updatePosition;
  
  const trackProgress = React.useCallback((
    currentTime: number,
    duration: number,
    force: boolean = false
  ) => {
    if (!lessonId || !autoSave || duration <= 0) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = (now - lastUpdateTimeRef.current) / 1000;
    const positionDifference = Math.abs(currentTime - lastSavedPositionRef.current);
    const progressPct = Math.min((currentTime / duration) * 100, 100);
    
    // Smart update conditions
    const shouldUpdate = force || (
      timeSinceLastUpdate >= updateInterval && 
      positionDifference >= 5 && // At least 5 seconds position change
      currentTime > 5 && // Don't save very early positions
      progressPct >= 1 // At least 1% progress
    );
    
    if (shouldUpdate) {
      // Use ref to avoid dependency on updatePosition
      updatePositionRef.current.mutate({
        lessonId,
        videoPositionSec: Math.floor(currentTime),
        videoDurationSec: Math.floor(duration),
        progressPct: Math.round(progressPct * 100) / 100, // Round to 2 decimal places
      });
      
      lastUpdateTimeRef.current = now;
      lastSavedPositionRef.current = currentTime;
    }
  }, [lessonId, autoSave, updateInterval]); // Remove updatePosition from dependencies
  
  // Store updateProgress in ref to avoid recreation
  const updateProgressRef = React.useRef(updateProgress);
  updateProgressRef.current = updateProgress;
  
  const markAsStarted = React.useCallback(() => {
    updateProgressRef.current.mutate({
      lessonId,
      state: 'in_progress',
      progressPct: 1,
      lessonKind: 'video',
    });
  }, [lessonId]);
  
  const markAsCompleted = React.useCallback((duration: number) => {
    updateProgressRef.current.mutate({
      lessonId,
      state: 'completed',
      progressPct: 100,
      videoPositionSec: Math.floor(duration),
      videoDurationSec: Math.floor(duration),
      lessonKind: 'video',
    });
  }, [lessonId]);
  
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
