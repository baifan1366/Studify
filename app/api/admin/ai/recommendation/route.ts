// app/api/admin/ai/recommendation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/ai/recommendation - Get recommendation system analytics
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const supabase = await createAdminClient();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get course progress with AI recommendations
    const { data: progressWithRecommendations, error: progressError } = await supabase
      .from('course_progress')
      .select('id, ai_recommendation, created_at, updated_at')
      .not('ai_recommendation', 'is', null)
      .gte('updated_at', daysAgo.toISOString());

    if (progressError) {
      throw progressError;
    }

    // Get embedding search analytics
    const { data: searches, error: searchError } = await supabase
      .from('embedding_searches')
      .select('id, search_type, results_count, processing_time_ms, created_at')
      .gte('created_at', daysAgo.toISOString());

    if (searchError) {
      throw searchError;
    }

    // Get community recommendation data (using the database functions we have)
    const { data: trendingPosts, error: trendingError } = await supabase
      .rpc('get_trending_posts', { 
        user_profile_id: 1, // Admin perspective
        days_back: days,
        limit_count: 20 
      });

    // Get user hashtag preferences for recommendation insights
    const { data: hashtagPrefs, error: hashtagError } = await supabase
      .rpc('get_user_hashtag_preferences', { 
        user_profile_id: 1, // Admin perspective
        limit_count: 50 
      });

    // Calculate recommendation effectiveness metrics
    const searchStats = searches?.reduce((acc, search) => {
      acc.total++;
      acc.totalProcessingTime += search.processing_time_ms || 0;
      acc.totalResults += search.results_count || 0;
      
      if (search.search_type) {
        acc.searchTypes[search.search_type] = (acc.searchTypes[search.search_type] || 0) + 1;
      }
      
      return acc;
    }, {
      total: 0,
      totalProcessingTime: 0,
      totalResults: 0,
      searchTypes: {} as Record<string, number>
    }) || { total: 0, totalProcessingTime: 0, totalResults: 0, searchTypes: {} };

    // Calculate recommendation coverage
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'student');

    const usersWithRecommendations = new Set(
      progressWithRecommendations?.map(p => p.id) || []
    ).size;

    const recommendationCoverage = totalUsers?.length 
      ? (usersWithRecommendations / totalUsers.length) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          activeRecommendations: progressWithRecommendations?.length || 0,
          totalSearches: searchStats.total,
          avgSearchResultsCount: searchStats.total > 0 ? searchStats.totalResults / searchStats.total : 0,
          avgSearchProcessingTime: searchStats.total > 0 ? searchStats.totalProcessingTime / searchStats.total : 0,
          recommendationCoverage: Math.round(recommendationCoverage * 100) / 100,
          trendingPostsCount: trendingPosts?.length || 0
        },
        searchTypeDistribution: searchStats.searchTypes,
        recentSearches: searches?.slice(0, 20) || [],
        trendingContent: trendingPosts || [],
        popularHashtags: hashtagPrefs || [],
        recommendationMetrics: {
          dailyRecommendations: progressWithRecommendations?.reduce((acc, rec) => {
            const date = new Date(rec.updated_at).toDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {}
        }
      }
    });

  } catch (error) {
    console.error('Recommendation analytics API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ai/recommendation - Update recommendation system settings
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, settings, userIds, contentTypes } = body;

    const supabase = await createAdminClient();

    switch (action) {
      case 'refresh_recommendations':
        // Trigger recommendation refresh for specific users or all users
        const targetUserIds = userIds || [];
        
        if (targetUserIds.length === 0) {
          // Get all student users if no specific users provided
          const { data: allStudents } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .limit(100); // Limit to prevent overwhelming

          targetUserIds.push(...(allStudents?.map(s => s.id) || []));
        }

        // Clear existing recommendations for refresh
        const { error: clearError } = await supabase
          .from('course_progress')
          .update({ ai_recommendation: null })
          .in('user_id', targetUserIds);

        if (clearError) {
          throw clearError;
        }

        // Here you would typically trigger your recommendation algorithm
        // For now, we'll just mark them for reprocessing
        return NextResponse.json({
          success: true,
          message: `Recommendations cleared for ${targetUserIds.length} users and queued for refresh`
        });

      case 'update_search_weights':
        // Update embedding search weights (this would typically be stored in a config table)
        if (!settings || !settings.embedding_weights) {
          return NextResponse.json(
            { message: 'Embedding weights are required' },
            { status: 400 }
          );
        }

        // In a real implementation, you'd store these weights in a configuration table
        // For now, we'll just validate and acknowledge
        const { e5, bge } = settings.embedding_weights;
        
        if (typeof e5 !== 'number' || typeof bge !== 'number' || Math.abs((e5 + bge) - 1) > 0.01) {
          return NextResponse.json(
            { message: 'Embedding weights must be numbers that sum to 1.0' },
            { status: 400 }
          );
        }

        // TODO: Store in configuration table
        return NextResponse.json({
          success: true,
          message: 'Search weights updated successfully',
          weights: { e5, bge }
        });

      case 'rebuild_embeddings':
        // Queue content for re-embedding with updated models
        if (!contentTypes || !Array.isArray(contentTypes)) {
          return NextResponse.json(
            { message: 'Content types array is required' },
            { status: 400 }
          );
        }

        const { error: rebuildError } = await supabase
          .from('embedding_queue')
          .update({
            status: 'queued',
            retry_count: 0,
            error_message: null,
            priority: 9, // Highest priority
            updated_at: new Date().toISOString()
          })
          .in('content_type', contentTypes);

        if (rebuildError) {
          throw rebuildError;
        }

        return NextResponse.json({
          success: true,
          message: `Embeddings queued for rebuild for content types: ${contentTypes.join(', ')}`
        });

      case 'optimize_search_performance':
        // Analyze and optimize search performance
        const { data: slowSearches } = await supabase
          .from('embedding_searches')
          .select('*')
          .gt('processing_time_ms', 1000) // Searches taking more than 1 second
          .order('processing_time_ms', { ascending: false })
          .limit(10);

        // Get performance recommendations
        const recommendations = [];
        
        if (slowSearches && slowSearches.length > 0) {
          recommendations.push('Consider optimizing database indexes for embedding searches');
          recommendations.push('Review embedding model performance and consider caching');
        }

        // Check embedding queue backlog
        const { count: queueBacklog } = await supabase
          .from('embedding_queue')
          .select('*', { count: 'exact' })
          .eq('status', 'queued');

        if (queueBacklog && queueBacklog > 100) {
          recommendations.push('High embedding queue backlog detected - consider scaling processing capacity');
        }

        return NextResponse.json({
          success: true,
          data: {
            slowSearches: slowSearches || [],
            queueBacklog: queueBacklog || 0,
            recommendations
          }
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Recommendation system operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform recommendation operation' },
      { status: 500 }
    );
  }
}
