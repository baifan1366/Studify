'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api-config';
import { quizApi, api } from '@/lib/api';
import { useMyCourses } from './use-courses';

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
    submissions: Array.isArray(submissionData) ? submissionData : [],
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

// ----------------------
// Course with Lessons Hooks for Quiz Creation
// ----------------------

interface CourseWithModulesAndLessons {
  id: number;
  title: string;
  description?: string;
  modules: {
    id: number;
    title: string;
    position: number;
    lessons: {
      id: number;
      title: string;
      description?: string;
      position: number;
      courseTitle: string;
      moduleTitle: string;
      fullTitle: string;
    }[];
  }[];
}

/**
 * Hook to fetch user's courses with their modules and lessons for quiz creation
 */
export function useMyCoursesWithLessons() {
  // First, get the basic course data
  const { data: courses, isLoading: coursesLoading } = useMyCourses();

  return useQuery<CourseWithModulesAndLessons[]>({
    queryKey: ['my-courses-with-lessons', courses?.map(c => c.id).sort()],
    queryFn: async () => {
      if (!courses || courses.length === 0) {
        return [];
      }

      console.log('🏫 [useMyCoursesWithLessons] Starting to fetch modules and lessons for courses:', courses.length);

      const coursesWithLessons: CourseWithModulesAndLessons[] = [];

      // Process each course sequentially to avoid overwhelming the API
      for (const course of courses) {
        try {
          console.log(`🔍 Processing course: ${course.title} (ID: ${course.id})`);

          // Fetch modules for this course
          const modulesResponse = await fetch(`/api/courses/${course.id}/course-module`);
          
          if (!modulesResponse.ok) {
            console.warn(`⚠️ Failed to fetch modules for course ${course.id}`);
            coursesWithLessons.push({
              ...course,
              modules: []
            });
            continue;
          }

          const modulesResult = await modulesResponse.json();
          const modules = modulesResult.data || [];
          console.log(`  📚 Found ${modules.length} modules for course ${course.title}`);

          const courseWithLessons: CourseWithModulesAndLessons = {
            ...course,
            modules: []
          };

          // Process each module
          for (const module of modules) {
            try {
              console.log(`    📖 Processing module: ${module.title} (ID: ${module.id})`);

              // Fetch lessons for this module
              const lessonsResponse = await fetch(`/api/courses/${course.id}/course-module/${module.id}/course-lesson`);
              
              if (!lessonsResponse.ok) {
                console.warn(`⚠️ Failed to fetch lessons for module ${module.id}`);
                courseWithLessons.modules.push({
                  ...module,
                  lessons: []
                });
                continue;
              }

              const lessonsResult = await lessonsResponse.json();
              const lessons = lessonsResult.data || [];
              console.log(`      📝 Found ${lessons.length} lessons for module ${module.title}`);

              // Transform lessons with additional metadata
              const transformedLessons = lessons.map((lesson: any) => ({
                ...lesson,
                courseTitle: course.title,
                moduleTitle: module.title,
                fullTitle: `${course.title} - ${module.title} - ${lesson.title}`
              }));

              courseWithLessons.modules.push({
                ...module,
                lessons: transformedLessons
              });

            } catch (error) {
              console.error(`❌ Error processing module ${module.id}:`, error);
              courseWithLessons.modules.push({
                ...module,
                lessons: []
              });
            }
          }

          coursesWithLessons.push(courseWithLessons);

        } catch (error) {
          console.error(`❌ Error processing course ${course.id}:`, error);
          coursesWithLessons.push({
            ...course,
            modules: []
          });
        }
      }

      console.log('📋 [useMyCoursesWithLessons] Final result:', {
        totalCourses: coursesWithLessons.length,
        totalModules: coursesWithLessons.reduce((sum, c) => sum + c.modules.length, 0),
        totalLessons: coursesWithLessons.reduce((sum, c) => 
          sum + c.modules.reduce((moduleSum: number, m: any) => moduleSum + m.lessons.length, 0), 0
        ),
        coursesWithLessons
      });

      return coursesWithLessons;
    },
    enabled: Boolean(courses && courses.length > 0 && !coursesLoading),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Helper hook to get a flat array of all lessons across all user's courses
 */
export function useMyAllLessons() {
  const { data: coursesWithLessons, isLoading, error } = useMyCoursesWithLessons();

  const allLessons = coursesWithLessons?.reduce((lessons: any[], course: any) => {
    course.modules.forEach((module: any) => {
      lessons.push(...module.lessons);
    });
    return lessons;
  }, []) || [];

  return {
    data: allLessons,
    isLoading,
    error,
    totalCount: allLessons.length
  };
}