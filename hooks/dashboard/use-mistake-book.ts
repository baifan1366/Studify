import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface MistakeEntry {
  id: string;
  user_id: string;
  course_id?: string;
  lesson_id?: string;
  mistake_content: string;
  analysis?: string;
  source_type: 'quiz' | 'assignment' | 'manual' | 'course_quiz' | 'ai_solve';
  knowledge_points: string[];
  recommended_exercises?: any;
  created_at: string;
  updated_at?: string;
}

// 获取用户的错题本
export function useMistakeBook(options: { 
  limit?: number; 
  courseId?: string;
  knowledgePoint?: string;
} = {}) {
  return useQuery({
    queryKey: ['mistake-book', options],
    queryFn: async (): Promise<MistakeEntry[]> => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.courseId) params.set('course_id', options.courseId);
      if (options.knowledgePoint) params.set('knowledge_point', options.knowledgePoint);

      const response = await fetch(`/api/mistake-book?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch mistake book');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// 保存错题到错题本
export function useSaveMistake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mistakeContent: string;
      analysis?: string;
      knowledgePoints?: string[];
      recommendedExercises?: any;
      courseId?: string;
      lessonId?: string;
      sourceType?: 'quiz' | 'assignment' | 'manual' | 'course_quiz' | 'ai_solve';
    }) => {
      const response = await fetch('/api/mistake-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save mistake');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 刷新错题本列表
      queryClient.invalidateQueries({ queryKey: ['mistake-book'] });
      
      toast.success('错题已保存到错题本', {
        description: '您可以在错题本中查看保存的错题',
      });
    },
    onError: (error) => {
      console.error('Failed to save mistake:', error);
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    },
  });
}

// 删除错题
export function useDeleteMistake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mistakeId: string) => {
      const response = await fetch(`/api/mistake-book?id=${mistakeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete mistake');
      }

      return response.json();
    },
    onSuccess: () => {
      // 刷新错题本列表
      queryClient.invalidateQueries({ queryKey: ['mistake-book'] });
      
      toast.success('错题已删除');
    },
    onError: (error) => {
      console.error('Failed to delete mistake:', error);
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    },
  });
}
