import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";

// Assignment interface matching our actual API
export interface ClassroomAssignment {
  id: number;
  classroom_id: number;
  author_id: number;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  slug?: string;
}

export interface AssignmentsResponse {
  assignments: ClassroomAssignment[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * Hook for fetching classroom assignments
 */
export function useClassroomAssignments(classroomSlug: string | undefined, status?: "upcoming" | "ongoing" | "completed") {
  const queryParams = new URLSearchParams();
  
  if (status) {
    queryParams.set('status', status);
  }

  return useQuery<AssignmentsResponse>({
    queryKey: ["classroom-assignments", classroomSlug, status],
    queryFn: () => apiGet<AssignmentsResponse>(`/api/classroom/${classroomSlug}/assignments?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching a single assignment
 */
export function useClassroomAssignment(classroomSlug: string | undefined, assignmentId: number | undefined) {
  return useQuery<{ assignment: ClassroomAssignment }>({
    queryKey: ["classroom-assignment", classroomSlug, assignmentId],
    queryFn: () => apiGet<{ assignment: ClassroomAssignment }>(`/api/classroom/${classroomSlug}/assignments/${assignmentId}`),
    enabled: !!classroomSlug && !!assignmentId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for creating assignments
 */
export function useCreateClassroomAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, data }: { 
      classroomSlug: string; 
      data: { title: string; description: string; due_date: string; }
    }) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/assignments`,
        method: 'POST',
        body: data
      });
    },
    onSuccess: (_, { classroomSlug }) => {
      // Invalidate all assignment queries for this classroom
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', classroomSlug] });
    },
  });
}

/**
 * Hook for updating assignments
 */
export function useUpdateClassroomAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, assignmentId, data }: { 
      classroomSlug: string; 
      assignmentId: number;
      data: { title?: string; description?: string; due_date?: string; }
    }) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/assignments/${assignmentId}`,
        method: 'PUT',
        body: data
      });
    },
    onSuccess: (_, { classroomSlug, assignmentId }) => {
      // Invalidate assignment queries
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', classroomSlug] });
      queryClient.invalidateQueries({ queryKey: ['classroom-assignment', classroomSlug, assignmentId] });
    },
  });
}

/**
 * Hook for deleting assignments
 */
export function useDeleteClassroomAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, assignmentId }: { 
      classroomSlug: string; 
      assignmentId: number;
    }) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/assignments/${assignmentId}`,
        method: 'DELETE'
      });
    },
    onSuccess: (_, { classroomSlug }) => {
      // Invalidate assignment queries
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', classroomSlug] });
    },
  });
}
