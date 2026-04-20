import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  CommunityRecommendations, 
  RecommendationFilters 
} from '@/interface/community/recommendation-interface';

interface UseCommunityRecommendationsOptions extends RecommendationFilters {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export function useCommunityRecommendations(options: UseCommunityRecommendationsOptions = {}) {
  const {
    limit = 20,
    offset = 0,
    since,
    groups_only = false,
    exclude_own_posts = true,
    min_score = 0,
    q,
    hashtags,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false
  } = options;

  console.log('🎣 [useCommunityRecommendations] Initializing hook with options:', {
    limit,
    offset,
    since,
    groups_only,
    exclude_own_posts,
    min_score,
    q,
    hashtags,
    enabled
  });

  const query = useQuery<CommunityRecommendations & { has_more?: boolean; total_count?: number }>({
    queryKey: [
      'community_recommendations', 
      { 
        limit, 
        offset,
        since, 
        groups_only, 
        exclude_own_posts, 
        min_score,
        q,
        hashtags
      }
    ],
    queryFn: async () => {
      console.log('🚀 [useCommunityRecommendations] Fetching recommendations...');
      const startTime = Date.now();
      let url = '';

      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
        if (since) params.append('since', since);
        if (groups_only) params.append('groupsOnly', 'true');
        if (!exclude_own_posts) params.append('excludeOwnPosts', 'false');
        if (min_score > 0) params.append('minScore', min_score.toString());
        if (q) params.append('q', q);
        if (hashtags && hashtags.length > 0) params.append('hashtags', hashtags.join(','));

        url = `/api/community/recommendations?${params.toString()}`;
        console.log('📡 [useCommunityRecommendations] API URL:', url);

        const response = await api.get(url);
        const data = response.data as CommunityRecommendations;

        const fetchTime = Date.now() - startTime;
        console.log('✅ [useCommunityRecommendations] Successfully fetched recommendations:', {
          recommendations_count: data.recommendations?.length || 0,
          categories: {
            from_groups: data.categories?.from_groups?.length || 0,
            authors_you_like: data.categories?.authors_you_like?.length || 0,
            trending: data.categories?.trending?.length || 0,
            for_you: data.categories?.for_you?.length || 0
          },
          fetch_time_ms: fetchTime,
          api_processing_time_ms: data.debug_info?.processing_time_ms,
          debug_info: data.debug_info
        });

        // Log top recommendations for debugging
        if (data.recommendations && data.recommendations.length > 0) {
          console.log('🏆 [useCommunityRecommendations] Top 3 recommendations:', 
            data.recommendations.slice(0, 3).map(rec => ({
              id: rec.id,
              title: rec.title?.substring(0, 50) + '...',
              score: rec.recommendation_score,
              reasons: rec.recommendation_reasons,
              author: rec.author?.display_name,
              group: rec.group?.name
            }))
          );
        }

        // Log success callback equivalent
        console.log('🎉 [useCommunityRecommendations] Query success:', {
          total_recommendations: data.recommendations?.length || 0,
          has_debug_info: !!data.debug_info,
          user_profile_id: data.debug_info?.user_profile_id,
          processing_time: data.debug_info?.processing_time_ms
        });

        return data;
      } catch (error) {
        const fetchTime = Date.now() - startTime;
        console.error('❌ [useCommunityRecommendations] Fetch failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fetch_time_ms: fetchTime,
          url: url,
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Log error callback equivalent
        console.error('💥 [useCommunityRecommendations] Query error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        throw error;
      }
    },
    enabled,
    staleTime,
    refetchOnWindowFocus,
    retry: (failureCount, error) => {
      console.log(`🔄 [useCommunityRecommendations] Retry attempt ${failureCount}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        will_retry: failureCount < 2
      });
      return failureCount < 2; // Retry up to 2 times
    }
  });

  return query;
}

// Specialized hooks for different use cases
export function useGroupRecommendations(options: Omit<UseCommunityRecommendationsOptions, 'groups_only'> = {}) {
  console.log('🏘️ [useGroupRecommendations] Initializing group-only recommendations');
  
  return useCommunityRecommendations({
    ...options,
    groups_only: true
  });
}

export function useTrendingPosts(options: Omit<UseCommunityRecommendationsOptions, 'min_score'> = {}) {
  console.log('📈 [useTrendingPosts] Initializing trending posts');
  
  return useCommunityRecommendations({
    ...options,
    min_score: 60, // Higher threshold for trending
    limit: options.limit || 10
  });
}

export function usePersonalizedFeed(options: UseCommunityRecommendationsOptions = {}) {
  console.log('🎯 [usePersonalizedFeed] Initializing personalized feed');
  
  return useCommunityRecommendations({
    ...options,
    exclude_own_posts: true,
    min_score: 30 // Moderate threshold for personalized content
  });
}

// Hook for refreshing recommendations manually
export function useRefreshRecommendations() {
  const { refetch } = useCommunityRecommendations({ enabled: false });
  
  return {
    refreshRecommendations: () => {
      console.log('🔄 [useRefreshRecommendations] Manually refreshing recommendations');
      return refetch();
    }
  };
}

// Hook for recommendation analytics/debugging
export function useRecommendationDebugInfo(enabled: boolean = false) {
  console.log('🐛 [useRecommendationDebugInfo] Initializing debug info hook, enabled:', enabled);
  
  return useQuery({
    queryKey: ['community_recommendations_debug'],
    queryFn: async () => {
      console.log('🔍 [useRecommendationDebugInfo] Fetching debug info...');
      
      const response = await api.get('/api/community/recommendations?limit=1');
      const data = response.data as CommunityRecommendations;
      
      console.log('📊 [useRecommendationDebugInfo] Debug info received:', data.debug_info);
      
      return data.debug_info;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false
  });
}
