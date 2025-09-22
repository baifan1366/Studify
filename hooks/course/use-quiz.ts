'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api-config';

interface UseQuizProps {
  lessonId: string;
}

export function useQuiz({ lessonId }: UseQuizProps) {
  const t = useTranslations('Quiz');
  const { toast } = useToast();

  const { data: quizData, isLoading, error } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => apiGet(`/api/course/quiz?lessonId=${lessonId}`),
    enabled: Boolean(lessonId), // Only run query when lessonId exists
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await fetch('/api/course/quiz/submit', {
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