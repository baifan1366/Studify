// User Profile Tool - 用户档案工具
import { DynamicTool } from "@langchain/core/tools";
import { createClient } from '@supabase/supabase-js';

export const userProfileTool = new DynamicTool({
  name: "get_user_profile",
  description: `Get comprehensive user profile information including preferences, progress, and learning history.
  Input should be a JSON string: {"userId": number, "includeProgress"?: boolean, "includePreferences"?: boolean}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { userId, includeProgress = false, includePreferences = true } = params;

      if (!userId) {
        return 'Error: userId is required';
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Get basic profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileError) {
        return `Failed to get user profile: ${profileError.message}`;
      }
      
      let result = `User Profile (ID: ${userId}):\n${JSON.stringify(profile, null, 2)}`;
      
      // Get learning progress if requested
      if (includeProgress) {
        const { data: progress } = await supabase
          .from('user_course_progress')
          .select(`
            *,
            course:course_id(
              title,
              difficulty_level
            ),
            lesson:lesson_id(
              title,
              lesson_type
            )
          `)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(20);
          
        result += `\n\nRecent Learning Progress (last 20 activities):\n${JSON.stringify(progress, null, 2)}`;
      }

      // Get user preferences and learning interests
      if (includePreferences && profile.preferences) {
        const preferences = profile.preferences;
        result += `\n\nUser Preferences and Interests:`;
        
        if (preferences.onboarding) {
          result += `\nOnboarding Data: ${JSON.stringify(preferences.onboarding, null, 2)}`;
        }
        
        if (preferences.interests) {
          result += `\nLearning Interests: ${JSON.stringify(preferences.interests, null, 2)}`;
        }

        if (preferences.learningStyle) {
          result += `\nLearning Style: ${JSON.stringify(preferences.learningStyle, null, 2)}`;
        }
      }

      // Get enrollment summary
      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select(`
          enrolled_at,
          course:courses(
            title,
            difficulty_level,
            estimated_hours
          )
        `)
        .eq('user_id', userId)
        .order('enrolled_at', { ascending: false });

      if (enrollments && enrollments.length > 0) {
        result += `\n\nCourse Enrollments (${enrollments.length} total):\n${JSON.stringify(enrollments.slice(0, 10), null, 2)}`;
      }
      
      return result;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with userId parameter.';
      }
      return `User profile retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
