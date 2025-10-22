import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface PathMilestone {
  id: string;
  name: string;
  description: string;
  order: number;
  completed: boolean;
  completedAt?: string;
  relatedCourses?: string[];
}

export interface LearningPathProgress {
  pathId: string;
  pathTitle: string;
  overallProgress: number; // 0-100
  milestones: PathMilestone[];
  currentMilestone: PathMilestone | null;
  nextMilestone: PathMilestone | null;
  completedMilestones: number;
  totalMilestones: number;
  estimatedCompletion: string;
}

// Get learning path progress
export function useLearningPathProgress(pathId?: string) {
  return useQuery({
    queryKey: ['learning-path-progress', pathId],
    queryFn: async (): Promise<LearningPathProgress[]> => {
      const params = new URLSearchParams();
      if (pathId) params.set('path_id', pathId);

      const response = await fetch(`/api/ai/coach/learning-path-progress?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch learning path progress');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Update milestone completion
export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      pathId: string;
      milestoneId: string;
      completed: boolean;
    }) => {
      const response = await fetch('/api/ai/coach/learning-path-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update milestone');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['learning-path-progress'] });
      
      toast.success('Milestone updated!', {
        description: 'Your learning path progress has been saved',
      });
    },
    onError: (error) => {
      console.error('Failed to update milestone:', error);
      toast.error('Update failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

// Calculate progress from learning path roadmap
export function calculatePathProgress(roadmap: any[], completedCourses: string[]): number {
  if (!roadmap || roadmap.length === 0) return 0;
  
  let totalSteps = 0;
  let completedSteps = 0;
  
  roadmap.forEach((step: any) => {
    totalSteps++;
    if (step.courseId && completedCourses.includes(step.courseId)) {
      completedSteps++;
    }
  });
  
  return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
}
