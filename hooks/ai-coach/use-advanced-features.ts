import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface SpacedRepetitionCard {
  id: string;
  noteId: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  nextReviewDate: string;
  interval: number; // days
  easeFactor: number;
  reviewCount: number;
  lastReviewed?: string;
  source: 'ai_note' | 'quiz' | 'manual';
  tags: string[];
}

export interface QuizFromNotes {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  sourceNotes: string[]; // AI note IDs
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourceNoteId: string;
  concept: string;
}

export interface ConceptSynthesis {
  id: string;
  title: string;
  description: string;
  involvedPaths: string[];
  connections: ConceptConnection[];
  synthesisText: string;
  aiInsights: string;
  practicalApplications: string[];
  suggestedProjects: string[];
  createdAt: string;
}

export interface ConceptConnection {
  pathId: string;
  pathTitle: string;
  concept: string;
  relationship: string;
  notes: string[]; // AI note IDs
}

// ============ Note-Based Quiz Generation ============

export function useGenerateQuizFromNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      noteIds: string[];
      questionCount?: number;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
    }) => {
      const response = await fetch('/api/ai/coach/quiz-from-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate quiz');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note-quizzes'] });
      
      toast.success('Quiz generated!', {
        description: `Created ${data.quiz.questions.length} questions from your notes`,
      });
    },
    onError: (error) => {
      console.error('Failed to generate quiz:', error);
      toast.error('Quiz generation failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

export function useNoteQuizzes(options?: { limit?: number }) {
  return useQuery({
    queryKey: ['note-quizzes', options],
    queryFn: async (): Promise<QuizFromNotes[]> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());

      const response = await fetch(`/api/ai/coach/quiz-from-notes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch note quizzes');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============ Spaced Repetition System ============

export function useSpacedRepetitionCards(options?: { 
  dueOnly?: boolean; 
  limit?: number;
}) {
  return useQuery({
    queryKey: ['spaced-repetition-cards', options],
    queryFn: async (): Promise<SpacedRepetitionCard[]> => {
      const params = new URLSearchParams();
      if (options?.dueOnly) params.set('due_only', 'true');
      if (options?.limit) params.set('limit', options.limit.toString());

      const response = await fetch(`/api/ai/coach/spaced-repetition?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch spaced repetition cards');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useReviewCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      cardId: string;
      quality: 0 | 1 | 2 | 3 | 4 | 5; // 0=blackout, 5=perfect
    }) => {
      const response = await fetch('/api/ai/coach/spaced-repetition', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review card');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-cards'] });
      
      const nextReview = new Date(data.card.nextReviewDate);
      toast.success('Progress saved!', {
        description: `Next review: ${nextReview.toLocaleDateString()}`,
      });
    },
    onError: (error) => {
      console.error('Failed to review card:', error);
      toast.error('Review failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

export function useGenerateCardsFromNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      noteIds: string[];
      cardsPerNote?: number;
    }) => {
      const response = await fetch('/api/ai/coach/spaced-repetition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate cards');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spaced-repetition-cards'] });
      
      toast.success('Flashcards created!', {
        description: `Generated ${data.cards.length} review cards from your notes`,
      });
    },
    onError: (error) => {
      console.error('Failed to generate cards:', error);
      toast.error('Card generation failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

// ============ Cross-Path Concept Synthesis ============

export function useGenerateConceptSynthesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      pathIds: string[];
      focusConcept?: string;
    }) => {
      const response = await fetch('/api/ai/coach/concept-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate synthesis');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['concept-syntheses'] });
      
      toast.success('Concept synthesis complete!', {
        description: `Found ${data.synthesis.connections.length} connections across your learning paths`,
      });
    },
    onError: (error) => {
      console.error('Failed to generate synthesis:', error);
      toast.error('Synthesis failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });
}

export function useConceptSyntheses(options?: { limit?: number }) {
  return useQuery({
    queryKey: ['concept-syntheses', options],
    queryFn: async (): Promise<ConceptSynthesis[]> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());

      const response = await fetch(`/api/ai/coach/concept-synthesis?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch concept syntheses');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============ Helper Functions ============

// SM-2 Algorithm for spaced repetition
export function calculateNextReview(
  quality: number, // 0-5
  currentInterval: number,
  currentEaseFactor: number
): { interval: number; easeFactor: number; nextReviewDate: Date } {
  let newEaseFactor = currentEaseFactor;
  let newInterval = currentInterval;

  if (quality >= 3) {
    // Correct response
    if (currentInterval === 0) {
      newInterval = 1;
    } else if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }
    
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Incorrect response
    newInterval = 1;
  }

  // Ensure ease factor doesn't go below 1.3
  newEaseFactor = Math.max(1.3, newEaseFactor);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReviewDate
  };
}
