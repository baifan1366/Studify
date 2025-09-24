import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface AINote {
  id: string;
  user_id: string;
  course_id?: string;
  lesson_id?: string;
  title: string;
  content: string;
  ai_summary?: string;
  tags: string[];
  note_type: string;
  created_at: string;
  updated_at?: string;
}

// 获取用户的AI笔记
export function useAINotes(options: { 
  limit?: number; 
  courseId?: string; 
} = {}) {
  return useQuery({
    queryKey: ['ai-notes', options],
    queryFn: async (): Promise<AINote[]> => {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.courseId) params.set('course_id', options.courseId);

      const response = await fetch(`/api/ai-notes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI notes');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// 保存AI笔记
export function useSaveAINote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      content: string;
      aiSummary: string;
      tags?: string[];
      lessonId?: string;
      courseId?: string;
      title?: string;
    }) => {
      const response = await fetch('/api/ai-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save AI note');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 刷新AI笔记列表
      queryClient.invalidateQueries({ queryKey: ['ai-notes'] });
      
      toast.success('智能笔记已保存', {
        description: '您可以在笔记本中查看保存的智能笔记',
      });
    },
    onError: (error) => {
      console.error('Failed to save AI note:', error);
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    },
  });
}
