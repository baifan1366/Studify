import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface QuizQuestion {
  id?: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  order_index: number;
  options?: string[];
  correct_answer?: string | string[];
}

export interface ClassroomQuiz {
  id: number;
  public_id: string;
  classroom_id: number;
  title: string;
  slug: string;
  settings: {
    shuffle?: boolean;
    time_limit?: number | null;
    allow_multiple_attempts?: boolean;
    due_date?: string | null;
  };
  total_questions: number;
  total_points: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  questions?: QuizQuestion[];
}

export interface CreateQuizData {
  title: string;
  time_limit?: number;
  allow_multiple_attempts?: boolean;
  due_date?: string;
  settings?: any;
  questions?: QuizQuestion[];
}

export interface UpdateQuizData {
  title?: string;
  time_limit?: number;
  allow_multiple_attempts?: boolean;
  due_date?: string;
  settings?: any;
  questions?: QuizQuestion[];
}

// Fetch quizzes for a classroom
export function useClassroomQuizzes(classroomSlug: string) {
  return useQuery({
    queryKey: ['classroom-quizzes', classroomSlug],
    queryFn: async () => {
      const response = await fetch(`/api/classroom/${classroomSlug}/quizzes`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch quizzes');
      }
      return response.json();
    },
    enabled: !!classroomSlug,
  });
}

// Create a new quiz
export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classroomSlug, data }: { classroomSlug: string; data: CreateQuizData }) => {
      const response = await fetch(`/api/classroom/${classroomSlug}/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create quiz');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classroom-quizzes', variables.classroomSlug] });
    },
  });
}

// Update a quiz
export function useUpdateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      classroomSlug, 
      quizId, 
      data 
    }: { 
      classroomSlug: string; 
      quizId: number; 
      data: UpdateQuizData 
    }) => {
      const response = await fetch(`/api/classroom/${classroomSlug}/quizzes/${quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update quiz');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classroom-quizzes', variables.classroomSlug] });
    },
  });
}

// Delete a quiz
export function useDeleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classroomSlug, quizId }: { classroomSlug: string; quizId: number }) => {
      const response = await fetch(`/api/classroom/${classroomSlug}/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete quiz');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classroom-quizzes', variables.classroomSlug] });
    },
  });
}
