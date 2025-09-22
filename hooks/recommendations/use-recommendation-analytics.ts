import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RecommendationAnalytics {
  total_recommendations: number;
  embedding_powered: number;
  traditional_only: number;
  average_scores: {
    total: number;
    traditional: number;
    embedding: number;
  };
  embedding_distribution: {
    high_similarity: number;    // >0.8
    medium_similarity: number;  // 0.5-0.8
    low_similarity: number;     // <0.5
  };
  top_embedding_reasons: string[];
  performance_metrics: {
    query_time_ms: number;
    embedding_lookup_time_ms: number;
    similarity_calculation_time_ms: number;
  };
}

export interface RecommendationInteraction {
  course_id: string;
  interaction_type: 'view' | 'click' | 'enroll' | 'bookmark';
  traditional_score?: number;
  embedding_score?: number;
  embedding_similarity?: number;
  recommendation_reasons: string[];
}

// Hook to get recommendation analytics
export function useRecommendationAnalytics(enabled: boolean = true) {
  return useQuery<RecommendationAnalytics>({
    queryKey: ['recommendation-analytics'],
    queryFn: async () => {
      const response = await api.get('/recommendations/analytics');
      return response.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to track recommendation interactions
export function useTrackRecommendationInteraction() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RecommendationInteraction>({
    mutationFn: async (interaction) => {
      await api.post('/recommendations/track', interaction);
    },
    onSuccess: () => {
      // Invalidate analytics to update metrics
      queryClient.invalidateQueries({ queryKey: ['recommendation-analytics'] });
    },
  });
}

// Hook to compare embedding vs traditional performance
export function useRecommendationComparison(timeframe: '24h' | '7d' | '30d' = '7d') {
  return useQuery({
    queryKey: ['recommendation-comparison', timeframe],
    queryFn: async () => {
      const response = await api.get(`/recommendations/comparison?timeframe=${timeframe}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get embedding model performance
export function useEmbeddingModelMetrics() {
  return useQuery({
    queryKey: ['embedding-model-metrics'],
    queryFn: async () => {
      const response = await api.get('/recommendations/embedding-metrics');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Custom hook to automatically track course card interactions
export function useRecommendationTracker() {
  const { mutate: trackInteraction } = useTrackRecommendationInteraction();

  const trackCourseView = (course: any) => {
    trackInteraction({
      course_id: course.id,
      interaction_type: 'view',
      traditional_score: course.traditional_score,
      embedding_score: course.embedding_score,
      embedding_similarity: course.embedding_similarity,
      recommendation_reasons: course.recommendation_reasons || [],
    });
  };

  const trackCourseClick = (course: any) => {
    trackInteraction({
      course_id: course.id,
      interaction_type: 'click',
      traditional_score: course.traditional_score,
      embedding_score: course.embedding_score,
      embedding_similarity: course.embedding_similarity,
      recommendation_reasons: course.recommendation_reasons || [],
    });
  };

  const trackCourseEnroll = (course: any) => {
    trackInteraction({
      course_id: course.id,
      interaction_type: 'enroll',
      traditional_score: course.traditional_score,
      embedding_score: course.embedding_score,
      embedding_similarity: course.embedding_similarity,
      recommendation_reasons: course.recommendation_reasons || [],
    });
  };

  const trackCourseBookmark = (course: any) => {
    trackInteraction({
      course_id: course.id,
      interaction_type: 'bookmark',
      traditional_score: course.traditional_score,
      embedding_score: course.embedding_score,
      embedding_similarity: course.embedding_similarity,
      recommendation_reasons: course.recommendation_reasons || [],
    });
  };

  return {
    trackCourseView,
    trackCourseClick,
    trackCourseEnroll,
    trackCourseBookmark,
  };
}

// Hook to get personalized embedding insights
export function usePersonalizedInsights(userId?: string) {
  return useQuery({
    queryKey: ['personalized-insights', userId],
    queryFn: async () => {
      const response = await api.get(`/recommendations/insights${userId ? `?userId=${userId}` : ''}`);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Types for analytics responses
export interface ComparisonMetrics {
  traditional_recommendations: {
    click_rate: number;
    enrollment_rate: number;
    avg_score: number;
    count: number;
  };
  embedding_recommendations: {
    click_rate: number;
    enrollment_rate: number;
    avg_score: number;
    count: number;
  };
  hybrid_recommendations: {
    click_rate: number;
    enrollment_rate: number;
    avg_score: number;
    count: number;
  };
  improvement_percentage: {
    click_rate: number;
    enrollment_rate: number;
  };
}

export interface EmbeddingModelMetrics {
  e5_small: {
    avg_similarity: number;
    processing_time_ms: number;
    usage_count: number;
  };
  bge_m3: {
    avg_similarity: number;
    processing_time_ms: number;
    usage_count: number;
  };
  hybrid: {
    avg_combined_similarity: number;
    processing_time_ms: number;
    usage_count: number;
  };
  recommendation_accuracy: {
    high_confidence: number;  // >0.8 similarity recommendations that were clicked
    medium_confidence: number; // 0.5-0.8
    low_confidence: number;   // <0.5
  };
}

export interface PersonalizedInsights {
  user_embedding_quality: 'excellent' | 'good' | 'fair' | 'poor';
  dominant_interests: string[];
  learning_path_suggestions: string[];
  embedding_model_preference: 'e5' | 'bge' | 'hybrid';
  recommended_profile_updates: string[];
  similarity_trends: {
    week: number[];
    categories: Record<string, number>;
  };
}
