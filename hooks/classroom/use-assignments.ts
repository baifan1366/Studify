import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiSend } from "@/lib/api-config";

// ========================
// Type Definitions
// ========================
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

export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  answer: string;
  file_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  status: "submitted" | "graded";
}

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

// ========================
// Queries
// ========================
export function useAssignments(classroomSlug: string | undefined, state?: "upcoming" | "incomplete" | "submitted") {
  const queryParams = new URLSearchParams();
  
  if (state) {
    queryParams.set('state', state);
  }

  return useQuery<Assignment[], Error>({
    queryKey: ["assignments", classroomSlug, state],
    queryFn: () => apiGet<Assignment[]>(`/api/classroom/${classroomSlug}/assignments?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignmentDetail(classroomSlug: string | undefined, id: string | undefined) {
  return useQuery<{ assignment: Assignment; submissions: Submission[] }, Error>({
    queryKey: ["assignment", classroomSlug, id],
    queryFn: () =>
      apiGet<{ assignment: Assignment; submissions: Submission[] }>(
        `/api/classroom/${classroomSlug}/assignments/${id}`
      ),
    enabled: !!classroomSlug && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMistakes(classroomSlug: string | undefined, userId?: string) {
  const queryParams = new URLSearchParams();
  if (userId) {
    queryParams.set('userId', userId);
  }

  return useQuery<Mistake[], Error>({
    queryKey: ["mistakes", classroomSlug, userId],
    queryFn: () =>
      apiGet<Mistake[]>(`/api/classroom/${classroomSlug}/assignments/mistakes?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 10 * 60 * 1000,
  });
}

// ========================
// Mutations
// ========================
export function useSubmitAssignment(classroomSlug: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Submission,
    Error,
    { id: string; answer: string; fileUrl?: string }
  >({
    mutationFn: ({ id, answer, fileUrl }) =>
      apiSend<Submission>({
        url: `/api/classroom/${classroomSlug}/assignments/${id}/submit`,
        method: "POST",
        body: { answer, fileUrl },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assignment", classroomSlug, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["assignments", classroomSlug] });

      toast({
        title: "提交成功",
        description: "作业已成功提交。",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "提交失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
