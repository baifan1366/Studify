import { useQuery } from '@tanstack/react-query';

export interface LearningMilestone {
  id: number;
  title: string;
  completed: boolean;
  progress: number;
  level: string;
  coursesCount: number;
}

export interface LearningMilestoneData {
  paths: any[];
  generatedMilestones: LearningMilestone[];
  overallProgress: number;
}

// 获取学习里程碑数据
export function useLearningMilestones(pathId?: string) {
  return useQuery({
    queryKey: ['learning-milestones', pathId],
    queryFn: async (): Promise<LearningMilestoneData> => {
      const params = new URLSearchParams();
      if (pathId) params.set('path_id', pathId);

      const response = await fetch(`/api/learning-paths/milestones?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch learning milestones');
      }
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// 获取用户成就徽章数据
export function useLearningBadges() {
  return useQuery({
    queryKey: ['learning-badges'],
    queryFn: async () => {
      const response = await fetch('/api/profile/achievements?category=learning');
      if (!response.ok) {
        throw new Error('Failed to fetch learning achievements');
      }
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
