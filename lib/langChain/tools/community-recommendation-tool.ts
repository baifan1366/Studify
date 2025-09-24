/**
 * Community Recommendation Tool for AI Assistant
 * Provides personalized community post and group recommendations using embedding similarity
 */

import { generateCommunityPostRecommendations, generateCommunityGroupRecommendations } from '@/lib/langChain/tools/course-recommendation-tool';

/**
 * AI Tool definition for Community Post Recommendations
 */
export const communityPostRecommendationTool = {
  name: "community_post_recommendations",
  description: `
    Generate personalized community post recommendations using AI-powered content similarity.
    
    Uses 40% embedding similarity + 60% other factors including:
    - Content similarity based on user's learning interests and activity
    - Post recency and engagement
    - Community popularity and activity
    - Content quality and relevance
    
    Use this when users ask about:
    - Finding interesting community posts
    - Discovering relevant discussions
    - What's happening in the community
    - Posts related to their interests
    - Content recommendations
  `,
  
  parameters: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Maximum number of post recommendations",
        minimum: 1,
        maximum: 20,
        default: 10
      },
      excludeOwnPosts: {
        type: "boolean",
        description: "Exclude user's own posts from recommendations",
        default: true
      },
      groupId: {
        type: "number",
        description: "Filter posts from specific group (optional)"
      },
      includePrivateGroups: {
        type: "boolean",
        description: "Include posts from private groups user has access to",
        default: false
      }
    }
  },

  handler: async function(parameters: any, context?: { userId?: number }) {
    const { maxResults, excludeOwnPosts, groupId, includePrivateGroups } = parameters;
    const userId = context?.userId;

    if (!userId) {
      return {
        success: false,
        error: "User authentication required",
        message: "Please log in to get personalized community post recommendations"
      };
    }

    try {
      const results = await generateCommunityPostRecommendations(userId, {
        maxResults,
        excludeOwnPosts,
        groupFilter: groupId,
        includePrivateGroups
      });

      if (!results.success) {
        return {
          success: false,
          error: results.error,
          message: `Community post recommendations failed: ${results.error}`
        };
      }

      // Format results for AI response
      const formattedResults = results.recommendations?.map((rec: any) => ({
        id: rec.post_id,
        title: rec.title,
        content: rec.body?.substring(0, 300) + (rec.body?.length > 300 ? "..." : ""),
        authorId: rec.author_id,
        groupId: rec.group_id,
        createdAt: rec.created_at,
        score: rec.recommendation_score,
        embeddingSimilarity: rec.embedding_similarity,
        reasons: rec.recommendation_reasons
      })) || [];

      return {
        success: true,
        userId: userId,
        totalRecommendations: results.totalRecommendations,
        recommendations: formattedResults,
        message: `Found ${formattedResults.length} personalized community post recommendations`
      };

    } catch (error) {
      console.error('Community post recommendation tool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

/**
 * AI Tool definition for Community Group Recommendations
 */
export const communityGroupRecommendationTool = {
  name: "community_group_recommendations",
  description: `
    Generate personalized community group recommendations using AI-powered similarity matching.
    
    Uses 40% embedding similarity + 60% other factors including:
    - Learning interests and activity patterns
    - Group activity and member engagement
    - Content relevance and quality
    - Community size and activity level
    
    Use this when users ask about:
    - Finding communities to join
    - Discovering relevant study groups
    - Communities matching their interests
    - Active learning communities
    - Group recommendations
  `,
  
  parameters: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Maximum number of group recommendations",
        minimum: 1,
        maximum: 20,
        default: 10
      },
      excludeJoinedGroups: {
        type: "boolean",
        description: "Exclude groups user has already joined",
        default: true
      },
      visibility: {
        type: "string",
        enum: ["public", "private"],
        description: "Filter by group visibility",
        default: "public"
      }
    }
  },

  handler: async function(parameters: any, context?: { userId?: number }) {
    const { maxResults, excludeJoinedGroups, visibility } = parameters;
    const userId = context?.userId;

    if (!userId) {
      return {
        success: false,
        error: "User authentication required",
        message: "Please log in to get personalized community group recommendations"
      };
    }

    try {
      const results = await generateCommunityGroupRecommendations(userId, {
        maxResults,
        excludeJoinedGroups,
        visibilityFilter: visibility
      });

      if (!results.success) {
        return {
          success: false,
          error: results.error,
          message: `Community group recommendations failed: ${results.error}`
        };
      }

      // Format results for AI response
      const formattedResults = results.recommendations?.map((rec: any) => ({
        id: rec.group_id,
        name: rec.name,
        description: rec.description?.substring(0, 200) + (rec.description?.length > 200 ? "..." : ""),
        visibility: rec.visibility,
        memberCount: rec.member_count,
        postCount: rec.post_count,
        score: rec.recommendation_score,
        embeddingSimilarity: rec.embedding_similarity,
        reasons: rec.recommendation_reasons
      })) || [];

      return {
        success: true,
        userId: userId,
        totalRecommendations: results.totalRecommendations,
        recommendations: formattedResults,
        message: `Found ${formattedResults.length} personalized community group recommendations`
      };

    } catch (error) {
      console.error('Community group recommendation tool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

/**
 * Export both tools for registration
 */
export default [
  communityPostRecommendationTool,
  communityGroupRecommendationTool
];
