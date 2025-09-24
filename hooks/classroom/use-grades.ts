import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';

// Grade interfaces
export interface Grade {
  id: number;
  public_id: string;
  assignment_id: number;
  user_id: number;
  grader_id: number;
  score: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
  classroom_assignment?: {
    id: number;
    title: string;
    due_date: string;
  };
  student?: {
    id: number;
    display_name: string;
    full_name: string;
    avatar_url?: string;
  };
  grader?: {
    id: number;
    display_name: string;
    full_name: string;
  };
}

export interface GradeStatistics {
  total_grades: number;
  average_score: number;
  grade_distribution: Record<string, number>;
  highest_score: number;
  lowest_score: number;
}

export interface GradesResponse {
  grades: Grade[];
  statistics?: GradeStatistics;
  classroom: {
    id: number;
    name: string;
  };
}

export interface CreateGradeRequest {
  student_id: number;
  score: number;
  feedback?: string;
}

export interface BulkGradeRequest {
  assignment_id: number;
  user_id: number;
  score: number;
  feedback?: string;
}

/**
 * Hook for fetching grades in a classroom
 */
export function useGrades(
  classroomSlug: string | undefined, 
  filters?: {
    assignment_id?: number;
    student_id?: number;
  }
) {
  const queryParams = new URLSearchParams();
  
  if (filters?.assignment_id) {
    queryParams.set('assignment_id', filters.assignment_id.toString());
  }
  
  if (filters?.student_id) {
    queryParams.set('student_id', filters.student_id.toString());
  }

  return useQuery<GradesResponse>({
    queryKey: ['classroom-grades', classroomSlug, filters],
    queryFn: () => apiGet<GradesResponse>(`/api/classroom/${classroomSlug}/grades?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching grades for a specific assignment
 */
export function useAssignmentGrades(classroomSlug: string | undefined, assignmentId: number | undefined) {
  return useQuery<{ grades: Grade[] }>({
    queryKey: ['assignment-grades', classroomSlug, assignmentId],
    queryFn: () => apiGet<{ grades: Grade[] }>(`/api/classroom/${classroomSlug}/assignments/${assignmentId}/grade`),
    enabled: !!classroomSlug && !!assignmentId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for creating/updating a grade
 */
export function useCreateGrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      classroomSlug, 
      assignmentId, 
      data 
    }: { 
      classroomSlug: string; 
      assignmentId: number; 
      data: CreateGradeRequest;
    }) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/assignments/${assignmentId}/grade`,
        method: 'POST',
        body: data
      });
    },
    onSuccess: (_, { classroomSlug, assignmentId, data }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['classroom-grades', classroomSlug] });
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', classroomSlug, assignmentId] });
      
      // Also invalidate submission queries since grades are related to submissions
      queryClient.invalidateQueries({ queryKey: ['classroom-submissions', classroomSlug, assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['classroom-submissions', classroomSlug] });
    },
  });
}

/**
 * Hook for bulk grading multiple assignments
 */
export function useBulkGrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      classroomSlug, 
      grades 
    }: { 
      classroomSlug: string; 
      grades: BulkGradeRequest[];
    }) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/grades`,
        method: 'POST',
        body: { grades }
      });
    },
    onSuccess: (_, { classroomSlug }) => {
      // Invalidate all grade-related queries
      queryClient.invalidateQueries({ queryKey: ['classroom-grades', classroomSlug] });
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', classroomSlug] });
      queryClient.invalidateQueries({ queryKey: ['classroom-submissions', classroomSlug] });
    },
  });
}

/**
 * Hook for deleting a grade
 */
export function useDeleteGrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      classroomSlug, 
      assignmentId, 
      studentId 
    }: { 
      classroomSlug: string; 
      assignmentId: number;
      studentId: number;
    }) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/assignments/${assignmentId}/grade?student_id=${studentId}`,
        method: 'DELETE'
      });
    },
    onSuccess: (_, { classroomSlug, assignmentId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['classroom-grades', classroomSlug] });
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', classroomSlug, assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['classroom-submissions', classroomSlug] });
    },
  });
}

/**
 * Hook for getting student's own grades
 */
export function useMyGrades(classroomSlug: string | undefined) {
  return useQuery<GradesResponse>({
    queryKey: ['my-grades', classroomSlug],
    queryFn: () => apiGet<GradesResponse>(`/api/classroom/${classroomSlug}/grades`),
    enabled: !!classroomSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes - student grades change less frequently
  });
}
