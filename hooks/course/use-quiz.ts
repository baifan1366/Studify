'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api-config';
import { quizApi, api } from '@/lib/api';

interface UseQuizProps {
  lessonId: string;
}

interface UseQuizByLessonQuizIdProps {
  lessonId: string;
  quizId: string;
}

//for student
export function useQuiz({ lessonId }: UseQuizProps) {
  const t = useTranslations('Quiz');
  const { toast } = useToast();

  const { data: quizData, isLoading, error } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => apiGet(quizApi.getLessonQuizByLessonId(lessonId)),
    enabled: Boolean(lessonId), // Only run query when lessonId exists
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; answer: string | boolean }) => {
      const response = await fetch(quizApi.createSubmission, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: data.questionId,
          userAnswer: typeof data.answer === 'boolean' ? data.answer.toString() : data.answer,
          timeTakenSec: 0, // Could be enhanced to track actual time
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: t('answer_submitted'),
        description: t('answer_submitted_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('submit_error'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmitAnswer = async (questionId: string, answer: string | boolean) => {
    await submitAnswerMutation.mutateAsync({ questionId, answer });
  };

  const handleQuizComplete = () => {
    toast({
      title: t('quiz_complete'),
      description: t('quiz_complete_desc'),
    });
  };

  const questions = (quizData as any)?.questions || [];

  return {
    questions,
    isLoading,
    error,
    isSubmitting: submitAnswerMutation.isPending,
    handleSubmitAnswer,
    handleQuizComplete,
  };
}

//for tutor
export function useQuizList() {
  const { data: quizData, isLoading, error } = useQuery({
    queryKey: ['quiz-list'],
    queryFn: () => apiGet(quizApi.getTutorQuiz),
  });

  return {
    quizData,
    isLoading,
    error,
  };
}

export function useQuizByLessonId({ lessonId }: UseQuizProps) {
  const { data: quizData, isLoading, error } = useQuery({
    queryKey: ['quiz-list', lessonId],
    queryFn: () => apiGet(quizApi.getTutorQuizByLessonId(lessonId)),
  });

  return {
    quizData,
    isLoading,
    error,
  };
}

export function useCreateQuizByLessonId({ lessonId }: UseQuizProps) {
  const { toast } = useToast();
  const t = useTranslations('QuizTable');
  const queryClient = useQueryClient();
  
  const createQuizMutation = useMutation({
    mutationFn: async (quizData: {
      question_text: string;
      question_type: string;
      options?: string[];
      correct_answer: any;
      points: number;
      difficulty: number;
      explanation?: string;
    }) => {
      return await api.post(quizApi.createTutorQuizByLessonId(lessonId), quizData);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-list', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-list'] });
      
      toast({
        title: t('quiz_added'),
        description: t('quiz_added'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error_adding'),
        description: error.message || t('error_adding'),
        variant: 'destructive',
      });
    },
  });

  return {
    createQuiz: createQuizMutation.mutateAsync,
    isCreating: createQuizMutation.isPending,
    error: createQuizMutation.error,
  };
}

export function useQuizSubmissions({ lessonId }: UseQuizProps) {
  const { data: submissionData, isLoading, error } = useQuery({
    queryKey: ['quiz-submissions', lessonId],
    queryFn: () => apiGet(quizApi.getSubmissionByLessonId(lessonId)),
    enabled: Boolean(lessonId),
  });

  return {
    submissions: (submissionData as any)?.data || [],
    isLoading,
    error,
  };
}

export function useQuizByLessonQuizId({ lessonId, quizId }: UseQuizByLessonQuizIdProps) {
  const { data: quizData, isLoading, error } = useQuery({
    queryKey: ['quiz-list', lessonId, quizId],
    queryFn: () => apiGet(quizApi.getTutorQuizByQuizId(lessonId, quizId)),
  });

  return {
    quizData,
    isLoading,
    error,
  };
}

export function useUpdateQuizByLessonQuizId({ lessonId, quizId }: UseQuizByLessonQuizIdProps) {
  const { toast } = useToast();
  const t = useTranslations('QuizTable');
  const queryClient = useQueryClient();
  
  const updateQuizMutation = useMutation({
    mutationFn: async (quizData: {
      question_text: string;
      question_type: string;
      options?: string[];
      correct_answer: any;
      points: number;
      difficulty: number;
      explanation?: string;
    }) => {
      return await api.put(quizApi.updateTutorQuizByQuizId(lessonId, quizId), quizData);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-list', lessonId, quizId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-list', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-list'] });
      
      toast({
        title: t('quiz_updated'),
        description: t('quiz_updated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error_updating'),
        description: error.message || t('error_updating'),
        variant: 'destructive',
      });
    },
  });

  return {
    updateQuiz: updateQuizMutation.mutateAsync,
    isUpdating: updateQuizMutation.isPending,
    error: updateQuizMutation.error,
  };
}

export function useDeleteQuizByLessonQuizId({ lessonId, quizId }: UseQuizByLessonQuizIdProps) {
  const { toast } = useToast();
  const t = useTranslations('QuizTable');
  const queryClient = useQueryClient();
  
  const deleteQuizMutation = useMutation({
    mutationFn: async () => {
      return await api.delete(quizApi.deleteTutorQuizByQuizId(lessonId, quizId));
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-list', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-list'] });
      
      toast({
        title: t('quiz_deleted'),
        description: t('quiz_deleted'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('error_deleting'),
        description: error.message || t('error_deleting'),
        variant: 'destructive',
      });
    },
  });

  return {
    deleteQuiz: deleteQuizMutation.mutateAsync,
    isDeleting: deleteQuizMutation.isPending,
    error: deleteQuizMutation.error,
  };
}

// Quiz Analysis Hook for students
export function useQuizAnalysis({ lessonId }: UseQuizProps) {
  const { data: analysisData, isLoading, error } = useQuery({
    queryKey: ['quiz-analysis', lessonId],
    queryFn: () => apiGet(`/api/course/quiz/analysis?lessonId=${lessonId}`),
    enabled: Boolean(lessonId),
  });

  return {
    analysis: analysisData || null,
    isLoading,
    error,
  };
}

// AI Quiz Generation Hook
export function useGenerateAIQuiz({ lessonId }: UseQuizProps) {
  const { toast } = useToast();
  const t = useTranslations('AddQuizAI');
  const queryClient = useQueryClient();
  
  const generateAIQuizMutation = useMutation({
    mutationFn: async (aiSettings: {
      numQuestions: number;
      difficulty: string;
      questionTypes: string[];
      topics?: string;
      customPrompt?: string;
    }) => {
      return await api.post(quizApi.generateAIQuiz(lessonId), aiSettings);
    },
    onSuccess: (data: any) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-list', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-list'] });
      
      toast({
        title: t('generation_success', { count: data.data?.questions?.length || 0 }),
        description: t('generation_success'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('generation_failed'),
        description: error.message || t('generation_failed'),
        variant: 'destructive',
      });
    },
  });

  return {
    generateQuiz: generateAIQuizMutation.mutateAsync,
    isGenerating: generateAIQuizMutation.isPending,
    error: generateAIQuizMutation.error,
  };
}

// Submission Grading Hook  
interface UseSubmissionGradingProps {
  lessonId: string;
  quizId: string;
  submissionId: string;
}

export function useSubmissionGrading({ lessonId, quizId, submissionId }: UseSubmissionGradingProps) {
  const { toast } = useToast();
  const t = useTranslations('ViewQuizSubmission');
  const queryClient = useQueryClient();
  
  const updateGradeMutation = useMutation({
    mutationFn: async (gradeData: {
      score?: number;
      feedback?: string;
      grading_status: string;
    }) => {
      return await api.put(quizApi.updateSubmissionGrade(lessonId, quizId, submissionId), gradeData);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions', lessonId, quizId] });
      
      toast({
        title: t('save_grading'),
        description: t('save_grading'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('saving'),
        description: error.message || 'Failed to save grading',
        variant: 'destructive',
      });
    },
  });

  return {
    updateGrade: updateGradeMutation.mutateAsync,
    isUpdating: updateGradeMutation.isPending,
    error: updateGradeMutation.error,
  };
}