// Content Recommendation Tool - 内容推荐工具
import { DynamicTool } from "@langchain/core/tools";
import { createClient } from '@supabase/supabase-js';
import { searchSimilarContentDual } from '../vectorstore';

export const recommendationTool = new DynamicTool({
  name: "recommend_content",
  description: `Generate personalized content recommendations based on user profile and learning history.
  Input should be a JSON string: {"userId": number, "contentType"?: "course|lesson|post", "maxRecommendations"?: number, "context"?: "additional context"}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { userId, contentType, maxRecommendations = 5, context } = params;

      if (!userId) {
        return 'Error: userId is required';
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get user profile and preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences, display_name')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return `No profile found for user ${userId}`;
      }

      // Get user's learning history
      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select(`
          course:courses(
            title,
            description,
            tags,
            difficulty_level,
            category
          )
        `)
        .eq('user_id', userId)
        .limit(10);

      // Build user context for recommendations
      let userContext = '';
      
      if (profile.preferences?.interests) {
        const interests = profile.preferences.interests;
        userContext += `User interests: ${interests.broadField || ''} - ${(interests.subFields || []).join(', ')}. `;
      }
      
      if (enrollments && enrollments.length > 0) {
        const courseTopics = enrollments
          .map(e => e.course && typeof e.course === 'object' ? (e.course as any).title : '')
          .filter(Boolean)
          .join(', ');
        userContext += `Previously enrolled in: ${courseTopics}. `;
      }

      if (context) {
        userContext += `Additional context: ${context}. `;
      }

      // Find similar content based on user profile
      const searchQuery = userContext || `recommend content for user ${userId}`;
      
      try {
        const recommendations = await searchSimilarContentDual(searchQuery, {
          contentTypes: contentType ? [contentType] : ['course', 'lesson', 'post'],
          maxResults: maxRecommendations * 2, // Get more to filter out already enrolled
          similarityThreshold: 0.6
        });

        // Filter out content user has already enrolled in or interacted with
        const enrolledCourseIds = enrollments
          ?.map(e => e.course && typeof e.course === 'object' ? (e.course as any).id : null)
          .filter(Boolean) || [];
        
        const filteredRecommendations = recommendations.filter(rec => {
          if (rec.content_type === 'course' && enrolledCourseIds.includes(rec.content_id)) {
            return false; // Skip already enrolled courses
          }
          return true;
        }).slice(0, maxRecommendations);

        // Get additional details for recommended content
        const enrichedRecommendations = [];
        
        for (const rec of filteredRecommendations) {
          let additionalDetails = {};
          
          if (rec.content_type === 'course') {
            const { data: courseDetails } = await supabase
              .from('courses')
              .select('title, description, difficulty_level, estimated_hours, rating_average, enrollment_count')
              .eq('id', rec.content_id)
              .single();
            
            additionalDetails = courseDetails || {};
          }

          enrichedRecommendations.push({
            rank: enrichedRecommendations.length + 1,
            type: rec.content_type,
            id: rec.content_id,
            similarity: rec.similarity,
            preview: rec.content_text.substring(0, 150) + '...',
            details: additionalDetails,
            reasoning: `Recommended based on user interests and learning history (${(rec.similarity * 100).toFixed(1)}% similarity)`
          });
        }

        return `Content Recommendations for User ${userId} (${profile.display_name}):

User Context: ${userContext}

Recommendations (${enrichedRecommendations.length} items):
${JSON.stringify(enrichedRecommendations, null, 2)}`;

      } catch (searchError) {
        console.warn('Semantic search failed, falling back to basic recommendations:', searchError);
        
        // Fallback: Get popular content in user's interest areas
        let fallbackQuery = supabase
          .from('courses')
          .select('id, title, description, difficulty_level, rating_average, enrollment_count')
          .order('rating_average', { ascending: false })
          .limit(maxRecommendations);

        // Filter by user's interests if available
        if (profile.preferences?.interests?.broadField) {
          fallbackQuery = fallbackQuery.ilike('description', `%${profile.preferences.interests.broadField}%`);
        }

        const { data: fallbackRecommendations } = await fallbackQuery;

        return `Content Recommendations for User ${userId} (Fallback):

User Context: ${userContext}

Popular Recommendations:
${JSON.stringify(fallbackRecommendations, null, 2)}`;
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with userId parameter.';
      }
      return `Content recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
