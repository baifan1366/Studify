import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RecommendedCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  requirements: string[];
  price: number;
  thumbnail_url: string;
  tutor_id: string;
  profiles: {
    display_name: string;
  };
  recommendation_score: number;
  traditional_score?: number;        // New: Traditional scoring (0-60)
  embedding_score?: number;          // New: Embedding scoring (0-40)
  embedding_similarity?: number;     // New: Raw similarity (0-1)
  recommendation_reasons: string[];
}

export interface CourseRecommendations {
  recommendations: RecommendedCourse[];
  categories: {
    continue_learning: any[];
    similar_to_completed: RecommendedCourse[];
    trending: RecommendedCourse[];
    for_you: RecommendedCourse[];
  };
}

export function useRecommendations() {
  return useQuery<CourseRecommendations>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await api.get('/recommendations');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
