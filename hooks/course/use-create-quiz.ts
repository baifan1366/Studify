import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface CreateQuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
  options?: string[];
  correct_answer: string | boolean;
  explanation?: string;
  points: number;
  difficulty: number;
  position: number;
}

export interface CreateQuizRequest {
  lessonId: string;
  questions: CreateQuizQuestion[];
}

export interface CreatedQuiz {
  id: string;
  lessonId: string;
  totalQuestions: number;
  totalPoints: number;
  questions: Array<{
    id: string;
    public_id: string;
    question_text: string;
    question_type: string;
    position: number;
    points: number;
    difficulty: number;
  }>;
}

export interface CreateQuizResponse {
  success: boolean;
  quiz?: CreatedQuiz;
  error?: string;
  message?: string;
}

/**
 * Hook for creating quiz questions for a lesson
 */
export function useCreateQuiz() {
  return useMutation<CreatedQuiz, Error, CreateQuizRequest>({
    mutationFn: async (request: CreateQuizRequest): Promise<CreatedQuiz> => {
      console.log('📝 Creating quiz questions for lesson:', request.lessonId);

      const response = await fetch('/api/course/quiz/create', {
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

      const data: CreateQuizResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'Quiz creation failed');
      }

      if (!data.quiz) {
        throw new Error('No quiz data received from server');
      }

      return data.quiz;
    },
    onSuccess: (quiz, variables) => {
      console.log(`✅ Quiz created successfully: ${quiz.totalQuestions} questions, ${quiz.totalPoints} points`);
      toast.success(
        `Quiz created successfully!`,
        {
          description: `Created ${quiz.totalQuestions} questions with ${quiz.totalPoints} total points`,
          duration: 5000,
        }
      );
    },
    onError: (error, variables) => {
      console.error('❌ Quiz creation failed:', error);
      toast.error(
        'Failed to create quiz',
        {
          description: error.message || 'An unexpected error occurred while creating the quiz.',
          duration: 8000,
        }
      );
    },
  });
}

/**
 * Utility function to convert AI generated questions to database format
 */
export function convertAIQuestionsToQuizFormat(
  aiQuestions: Array<{
    id: string;
    question_text: string;
    question_type: string;
    options: string[];
    correct_answer: string | boolean;
    explanation: string;
    points: number;
    difficulty: number;
    position: number;
  }>
): CreateQuizQuestion[] {
  return aiQuestions.map(q => ({
    question_text: q.question_text,
    question_type: q.question_type as CreateQuizQuestion['question_type'],
    options: q.options && q.options.length > 0 ? q.options : undefined,
    correct_answer: q.correct_answer,
    explanation: q.explanation || undefined,
    points: q.points,
    difficulty: q.difficulty,
    position: q.position,
  }));
}

/**
 * Utility function to validate quiz questions before creation
 */
export function validateQuizQuestions(questions: CreateQuizQuestion[]): string[] {
  const errors: string[] = [];

  if (!questions || questions.length === 0) {
    errors.push('At least one question is required');
    return errors;
  }

  questions.forEach((question, index) => {
    const questionNum = index + 1;

    if (!question.question_text?.trim()) {
      errors.push(`Question ${questionNum}: Question text is required`);
    }

    if (!question.question_type) {
      errors.push(`Question ${questionNum}: Question type is required`);
    }

    if (question.question_type === 'multiple_choice') {
      if (!question.options || question.options.length < 2) {
        errors.push(`Question ${questionNum}: Multiple choice questions need at least 2 options`);
      }
      if (question.options && !question.options.includes(question.correct_answer as string)) {
        errors.push(`Question ${questionNum}: Correct answer must be one of the provided options`);
      }
    }

    if (question.points < 1 || question.points > 100) {
      errors.push(`Question ${questionNum}: Points must be between 1 and 100`);
    }

    if (question.difficulty < 1 || question.difficulty > 5) {
      errors.push(`Question ${questionNum}: Difficulty must be between 1 and 5`);
    }
  });

  return errors;
}

export default useCreateQuiz;
