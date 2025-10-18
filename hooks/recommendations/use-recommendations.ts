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

// Helper function to transform recommendations data for components
export function transformRecommendationsData(data?: CourseRecommendations) {
  if (!data) {
    return { courses: [], categories: {} };
  }
  
  return {
    courses: data.recommendations || [],
    categories: data.categories || {
      continue_learning: [],
      similar_to_completed: [],
      trending: [],
      for_you: []
    }
  };
}

// Hook for fetching recommendations by groups
export function useRecommendationGroups() {
  return useQuery({
    queryKey: ['recommendations', 'groups'],
    queryFn: async () => {
      const response = await api.get('/recommendations/groups');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching recommendations by posts
export function useRecommendationPosts() {
  return useQuery({
    queryKey: ['recommendations', 'posts'],
    queryFn: async () => {
      const response = await api.get('/recommendations/posts');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
