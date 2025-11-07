"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-config";
import { CommunityQuiz } from "@/interface/community/quiz-interface";

// Interface for quiz attempt with details
export interface QuizAttemptDetail {
  id: number;
  quiz_id: number;
  quiz: {
    id: number;
    title: string;
    slug: string;
    difficulty: number;
    tags: string[];
  };
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  score: number;
  created_at: string;
  total_questions?: number;
  correct_answers?: number;
}

// Interface for shared private quiz with permission details
export interface SharedPrivateQuiz {
  quiz_id: number;
  quiz_slug: string;
  title: string;
  description?: string;
  tags?: string[];
  difficulty: number;
  max_attempts?: number;
  time_limit_minutes?: number;
  permission_type: 'attempt' | 'edit';
  expires_at?: string;
  granted_by: string;
  granted_by_name: string;
  granted_by_avatar?: string;
  permission_created_at: string;
}

// Hook to get user's quiz attempts
export const useUserQuizAttempts = (limit?: number) => {
  return useQuery<QuizAttemptDetail[], Error>({
    queryKey: ["userQuizAttempts", limit],
    queryFn: () => apiGet<QuizAttemptDetail[]>(
      `/api/community/quizzes/user/attempts${limit ? `?limit=${limit}` : ''}`
    ),
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
};

// Hook to get all user's quiz attempts (for modal)
export const useAllUserQuizAttempts = () => {
  return useQuery<QuizAttemptDetail[], Error>({
    queryKey: ["allUserQuizAttempts"],
    queryFn: () => apiGet<QuizAttemptDetail[]>("/api/community/quizzes/user/all-attempts"),
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
};

// Hook to get private quizzes shared with the user
export const useSharedPrivateQuizzes = () => {
  return useQuery<{ quizzes: SharedPrivateQuiz[] }, Error>({
    queryKey: ["sharedPrivateQuizzes"],
    queryFn: () => apiGet<{ quizzes: SharedPrivateQuiz[] }>("/api/community/quizzes/shared-private"),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

// Hook to get quiz attempt statistics
export const useQuizAttemptStats = () => {
  return useQuery<{
    total_attempts: number;
    completed_attempts: number;
    in_progress_attempts: number;
    average_score: number;
    best_score: number;
  }, Error>({
    queryKey: ["quizAttemptStats"],
    queryFn: () => apiGet("/api/community/quizzes/user/stats"),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
