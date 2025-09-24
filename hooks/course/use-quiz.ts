'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api-config';
import { quizApi } from '@/lib/api';

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
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await fetch(quizApi.createSubmission, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          questionId: data.questionId,
          answer: data.answer,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
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

  const handleSubmitAnswer = async (questionId: string, answer: string) => {
    await submitAnswerMutation.mutateAsync({ questionId, answer });
  };

  const handleQuizComplete = () => {
    toast({
      title: t('quiz_complete'),
      description: t('quiz_complete_desc'),
    });
  };

  const questions = (quizData as any)?.data?.questions || (quizData as any)?.questions || [];

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
  const { toast } = useToast()
  const t = useTranslations('Quiz');
  const { data: quizData, error } = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await fetch(quizApi.createSubmission, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          questionId: data.questionId,
          answer: data.answer,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
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

  return {
    quizData,
    error,
  };
}

export function useQuizSubmission({ lessonId }: UseQuizProps) {
  const { toast } = useToast()
  const t = useTranslations('Quiz');
  const { data: quizData, error } = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await fetch(quizApi.createSubmission, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          questionId: data.questionId,
          answer: data.answer,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
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

  return {
    quizData,
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
  const { toast } = useToast()
  const t = useTranslations('Quiz');
  const { data: quizData, error } = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await fetch(quizApi.createSubmission, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          quizId,
          questionId: data.questionId,
          answer: data.answer,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
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

  return {
    quizData,
    error,
  };
}

export function useDeleteQuizByLessonQuizId({ lessonId, quizId }: UseQuizByLessonQuizIdProps) {
  const { toast } = useToast()
  const t = useTranslations('Quiz');
  const { data: quizData, error } = useMutation({
    mutationFn: async () => {
      const response = await fetch(quizApi.createSubmission, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          quizId,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
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

  return {
    quizData,
    error,
  };
}