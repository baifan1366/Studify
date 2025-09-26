import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface GenerateQuizRequest {
  topic: string;
  num_questions?: number;
  difficulty?: number;
  question_types?: string[];
  focus_topics?: string;
  include_explanations?: boolean;
  lesson_content?: string;
  custom_instructions?: string;
  lessonId?: string;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string | boolean;
  explanation: string;
  points: number;
  difficulty: number;
  position: number;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  total_points: number;
  estimated_time_minutes: number;
  questions: QuizQuestion[];
}

export interface GenerateQuizResponse {
  success: boolean;
  quiz?: GeneratedQuiz;
  error?: string;
  message?: string;
}

/**
 * Hook for generating quiz using AI
 */
export function useGenerateQuiz() {
  return useMutation<GeneratedQuiz, Error, GenerateQuizRequest>({
    mutationFn: async (request: GenerateQuizRequest): Promise<GeneratedQuiz> => {
      console.log('🎯 Generating quiz with AI:', request);

      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GenerateQuizResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'Quiz generation failed');
      }

      if (!data.quiz) {
        throw new Error('No quiz data received from AI');
      }

      return data.quiz;
    },
    onSuccess: (quiz, variables) => {
      console.log(`✅ Quiz generated successfully: ${quiz.questions.length} questions`);
      toast.success(
        `Quiz generated successfully!`,
        {
          description: `Created ${quiz.questions.length} questions on ${variables.topic}`,
          duration: 5000,
        }
      );
    },
    onError: (error, variables) => {
      console.error('❌ Quiz generation failed:', error);
      toast.error(
        'Failed to generate quiz',
        {
          description: error.message || 'An unexpected error occurred while generating the quiz.',
          duration: 8000,
        }
      );
    },
  });
}

/**
 * Hook for getting quiz generation capabilities
 */
export function useQuizGenerationCapabilities() {
  return useMutation<any, Error, void>({
    mutationFn: async (): Promise<any> => {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

/**
 * Utility function to validate quiz request parameters
 */
export function validateQuizRequest(request: GenerateQuizRequest): string[] {
  const errors: string[] = [];

  if (!request.topic?.trim()) {
    errors.push('Topic is required');
  }

  if (request.num_questions && (request.num_questions < 1 || request.num_questions > 50)) {
    errors.push('Number of questions must be between 1 and 50');
  }

  if (request.difficulty && (request.difficulty < 1 || request.difficulty > 5)) {
    errors.push('Difficulty must be between 1 and 5');
  }

  if (request.question_types && request.question_types.length === 0) {
    errors.push('At least one question type must be selected');
  }

  const validQuestionTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'];
  if (request.question_types) {
    const invalidTypes = request.question_types.filter(type => !validQuestionTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid question types: ${invalidTypes.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Utility function to get default quiz request
 */
export function getDefaultQuizRequest(topic: string): GenerateQuizRequest {
  return {
    topic,
    num_questions: 5,
    difficulty: 2,
    question_types: ['multiple_choice', 'true_false'],
    include_explanations: true,
  };
}

/**
 * Utility function to format quiz for display
 */
export function formatQuizForDisplay(quiz: GeneratedQuiz) {
  return {
    ...quiz,
    questions: quiz.questions.map(question => ({
      ...question,
      // Ensure options is always an array
      options: Array.isArray(question.options) ? question.options : [],
      // Format explanation with proper capitalization
      explanation: question.explanation ? 
        question.explanation.charAt(0).toUpperCase() + question.explanation.slice(1) 
        : '',
    }))
  };
}

export default useGenerateQuiz;
