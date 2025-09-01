import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';

// 作业类型定义
export interface Assignment {
  id: string;
  title: string;
  course_name: string;
  published_on: string;
  due_on: string;
  status: string;
  description?: string;
  attachments?: string[];
}

// 作业提交类型定义
export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  answer: string;
  file_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded';
}

// 错题本类型定义
export interface Mistake {
  id: string;
  user_id: string;
  assignment_id: string;
  submission_id: string;
  question_id: string;
  mistake_content: string;
  analysis: string;
  knowledge_points: string[];
  recommended_exercises: string[];
  created_at: string;
}

// 获取作业列表
async function fetchAssignments(state: 'upcoming' | 'incomplete' | 'submitted'): Promise<Assignment[]> {
  const response = await fetch(`/api/classroom/assignments?state=${state}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch assignments');
  }
  
  return response.json();
}

// 获取作业详情
async function fetchAssignmentDetail(id: string): Promise<{
  assignment: Assignment;
  submissions: Submission[];
}> {
  const response = await fetch(`/api/classroom/assignments/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch assignment details');
  }
  
  return response.json();
}

// 提交作业
async function submitAssignment({ id, answer, fileUrl }: {
  id: string;
  answer: string;
  fileUrl?: string;
}): Promise<Submission> {
  const response = await fetch(`/api/classroom/assignments/${id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answer, fileUrl }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit assignment');
  }
  
  return response.json();
}

// 获取错题本
async function fetchMistakes(userId?: string): Promise<Mistake[]> {
  const url = userId ? `/api/classroom/assignments/mistakes?userId=${userId}` : '/api/classroom/assignments/mistakes';
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch mistakes');
  }
  
  return response.json();
}

/**
 * Hook for fetching assignments based on their state
 * @param state - The state of assignments to fetch ('upcoming', 'incomplete', or 'submitted')
 * @returns Query result with assignments data, loading state, and error
 */
export function useAssignments(state: 'upcoming' | 'incomplete' | 'submitted') {
  return useQuery<Assignment[], Error>({
    queryKey: ['assignments', state],
    queryFn: () => fetchAssignments(state),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single assignment's details by ID
 * @param id - The ID of the assignment to fetch
 * @returns Query result with assignment details, loading state, and error
 */
export function useAssignmentDetail(id: string) {
  return useQuery<{
    assignment: Assignment;
    submissions: Submission[];
  }, Error>({
    queryKey: ['assignment', id],
    queryFn: () => fetchAssignmentDetail(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for submitting an assignment
 * @returns Mutation function for submitting assignments
 */
export function useSubmitAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation<
    Submission,
    Error,
    { id: string; answer: string; fileUrl?: string }
  >({
    mutationFn: submitAssignment,
    onSuccess: (data, variables) => {
      // 成功后刷新作业详情和作业列表
      queryClient.invalidateQueries({ queryKey: ['assignment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      
      toast({
        title: '提交成功',
        description: '作业已成功提交，正在进行AI批改...',
      });
    },
    onError: (error) => {
      toast({
        title: '提交失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for fetching mistakes from the mistake book
 * @param userId - Optional user ID to fetch mistakes for a specific user (for teachers)
 * @returns Query result with mistakes data, loading state, and error
 */
export function useMistakes(userId?: string) {
  return useQuery<Mistake[], Error>({
    queryKey: ['mistakes', userId],
    queryFn: () => fetchMistakes(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}