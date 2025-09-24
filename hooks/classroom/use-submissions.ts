import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';
import { Submission, SubmissionResponse, SubmissionListResponse, CreateSubmissionRequest, GradeSubmissionRequest } from '@/interface/classroom/submission-interface';

/**
 * Hook for fetching submissions for a classroom or specific assignment
 */
export function useSubmissions(classroomSlug: string, assignmentId?: number, studentId?: number) {
  const queryParams = new URLSearchParams();
  
  if (assignmentId) {
    queryParams.set('assignment_id', assignmentId.toString());
  }
  
  if (studentId) {
    queryParams.set('student_id', studentId.toString());
  }

  return useQuery<SubmissionListResponse>({
    queryKey: ['classroom-submissions', classroomSlug, assignmentId, studentId],
    queryFn: () => apiGet<SubmissionListResponse>(`/api/classroom/${classroomSlug}/submissions?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for fetching a single submission
 */
export function useSubmission(classroomSlug: string, submissionId: number) {
  return useQuery<SubmissionResponse>({
    queryKey: ['classroom-submission', classroomSlug, submissionId],
    queryFn: () => apiGet<SubmissionResponse>(`/api/classroom/${classroomSlug}/submissions/${submissionId}`),
    enabled: !!classroomSlug && !!submissionId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for creating a submission
 */
export function useCreateSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, data }: { classroomSlug: string; data: CreateSubmissionRequest & { assignment_id: number } }) => {
      return apiSend<SubmissionResponse>({
        url: `/api/classroom/${classroomSlug}/submissions`,
        method: 'POST',
        body: data
      });
    },
    onSuccess: (_, { classroomSlug, data }) => {
      // Invalidate submissions queries for this assignment
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug, data.assignment_id]
      });
      // Invalidate all submissions for this classroom
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug]
      });
    },
  });
}

/**
 * Hook for updating a submission (content update by student)
 */
export function useUpdateSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, submissionId, content }: { 
      classroomSlug: string; 
      submissionId: number; 
      content: string; 
    }) => {
      return apiSend<SubmissionResponse>({
        url: `/api/classroom/${classroomSlug}/submissions/${submissionId}`,
        method: 'PUT',
        body: { content }
      });
    },
    onSuccess: (_, { classroomSlug, submissionId }) => {
      // Invalidate the specific submission
      queryClient.invalidateQueries({
        queryKey: ['classroom-submission', classroomSlug, submissionId]
      });
      // Invalidate submissions list
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug]
      });
    },
  });
}

/**
 * Hook for grading a submission
 */
export function useGradeSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, submissionId, data }: { 
      classroomSlug: string; 
      submissionId: number; 
      data: GradeSubmissionRequest; 
    }) => {
      return apiSend<SubmissionResponse>({
        url: `/api/classroom/${classroomSlug}/submissions/${submissionId}/grade`,
        method: 'PUT',
        body: data
      });
    },
    onSuccess: (_, { classroomSlug, submissionId }) => {
      // Invalidate the specific submission
      queryClient.invalidateQueries({
        queryKey: ['classroom-submission', classroomSlug, submissionId]
      });
      // Invalidate submissions list
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug]
      });
    },
  });
}

/**
 * Hook for deleting a submission
 */
export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, submissionId }: { 
      classroomSlug: string; 
      submissionId: number; 
    }) => {
      return apiSend({
        url: `/api/classroom/${classroomSlug}/submissions/${submissionId}`,
        method: 'DELETE'
      });
    },
    onSuccess: (_, { classroomSlug }) => {
      // Invalidate submissions list
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug]
      });
    },
  });
}

/**
 * Legacy hook for submitting assignment (backward compatibility)
 */
export function useSubmitAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, assignmentId, content, attachmentIds }: { 
      classroomSlug: string; 
      assignmentId: number; 
      content: string;
      attachmentIds?: number[];
    }) => {
      return apiSend<SubmissionResponse>({
        url: `/api/classroom/${classroomSlug}/assignments/${assignmentId}/submit`,
        method: 'POST',
        body: { content, attachment_ids: attachmentIds || [] }
      });
    },
    onSuccess: (_, { classroomSlug, assignmentId }) => {
      // Invalidate submissions queries for this assignment
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug, assignmentId]
      });
    },
  });
}

/**
 * Legacy hook for updating assignment submission (backward compatibility)
 */
export function useUpdateAssignmentSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classroomSlug, assignmentId, content, attachmentIds }: { 
      classroomSlug: string; 
      assignmentId: number; 
      content: string;
      attachmentIds?: number[];
    }) => {
      return apiSend<SubmissionResponse>({
        url: `/api/classroom/${classroomSlug}/assignments/${assignmentId}/submit`,
        method: 'PUT',
        body: { content, attachment_ids: attachmentIds || [] }
      });
    },
    onSuccess: (_, { classroomSlug, assignmentId }) => {
      // Invalidate submissions queries for this assignment
      queryClient.invalidateQueries({
        queryKey: ['classroom-submissions', classroomSlug, assignmentId]
      });
    },
  });
}
