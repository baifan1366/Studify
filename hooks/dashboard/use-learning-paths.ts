import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface LearningPath {
  id: string;
  user_id: string;
  title: string;
  description: string;
  learning_goal: string;
  current_level: string;
  time_constraint: string;
  mermaid_diagram: string;
  roadmap: any[];
  recommended_courses: any[];
  quiz_suggestions: any[];
  study_tips: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// 获取用户的学习路径
export function useLearningPaths(options: { 
  limit?: number; 
  activeOnly?: boolean; 
} = {}) {
  return useQuery({
    queryKey: ['learning-paths', options],
    queryFn: async (): Promise<LearningPath[]> => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.activeOnly) params.set('active_only', 'true');

      const response = await fetch(`/api/learning-paths?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch learning paths');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// 保存学习路径
export function useSaveLearningPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      learningPath: any;
      title?: string;
      description?: string;
    }) => {
      const response = await fetch('/api/learning-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save learning path');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 刷新学习路径列表
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      
      toast.success('学习路径已保存', {
        description: '您可以在仪表盘中查看保存的学习路径',
      });
    },
    onError: (error) => {
      console.error('Failed to save learning path:', error);
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    },
  });
}

// 删除学习路径
export function useDeleteLearningPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pathId: string) => {
      const response = await fetch(`/api/learning-paths?id=${pathId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete learning path');
      }

      return response.json();
    },
    onSuccess: () => {
      // 刷新学习路径列表
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      
      toast.success('学习路径已删除');
    },
    onError: (error) => {
      console.error('Failed to delete learning path:', error);
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    },
  });
}
