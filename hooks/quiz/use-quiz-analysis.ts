import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-config';

export interface QuizQuestion {
  id: number;
  public_id: string;
  lesson_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
  options?: string[];
  correct_answer: any;
  explanation?: string;
  points: number;
  difficulty: number;
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_answer?: any;
  is_correct?: boolean;
  points_earned?: number;
  submitted_at?: string;
}

export interface QuizAnalysisResponse {
  questions: QuizQuestion[];
  user_stats: {
    total_score: number;
    max_possible_score: number;
    percentage: number;
    correct_count: number;
    total_questions: number;
    time_taken_sec: number;
    completed_at: string | null;
  };
  lesson_stats: {
    total_submissions: number;
    average_score: number;
    completion_rate: number;
    difficulty_breakdown: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

/**
 * Hook for fetching quiz analysis data
 * @param lessonId - The public ID of the lesson
 */
export function useQuizAnalysis(lessonId: string | null) {
  return useQuery<QuizAnalysisResponse>({
    queryKey: ['quiz', 'analysis', lessonId],
    queryFn: async () => {
      const response = await apiGet<QuizAnalysisResponse>(
        `/api/course/quiz/analysis?lessonId=${lessonId}`
      );
      return response;
    },
    enabled: !!lessonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}
