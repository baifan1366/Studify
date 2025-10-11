/**
 * Course Recommendation Tool for AI Assistant
 * Provides personalized course recommendations based on user profile, learning history, and preferences
 */

import { DynamicTool } from "@langchain/core/tools";
import { createAdminClient } from '@/utils/supabase/server';
import { calculateDualEmbeddingSimilarity } from '@/utils/embedding/vector-similarity';

// Types for course recommendations
interface CourseRecommendation {
  course_id: number;
  public_id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  is_free: boolean;
  price_cents: number;
  thumbnail_url: string;
  total_students: number;
  average_rating: number;
  recommendation_score: number;
  recommendation_reasons: string[];
}

interface CommunityPostRecommendation {
  post_id: number;
  public_id: string;
  title: string;
  body: string;
  author_id: number;
  group_id?: number;
  created_at: string;
  recommendation_score: number;
  embedding_similarity: number;
  recommendation_reasons: string[];
}

interface CommunityGroupRecommendation {
  group_id: number;
  public_id: string;
  name: string;
  description: string;
  visibility: string;
  member_count: number;
  post_count: number;
  recommendation_score: number;
  embedding_similarity: number;
  recommendation_reasons: string[];
}

interface UserPreferences {
  interests: string[];
  preferred_categories: string[];
  skill_level: string;
  learning_goals: string[];
  time_availability: string;
  role?: string;
}

// Additional types for better type safety
interface CourseEnrollment {
  course_id: number;
  course?: {
    category?: string;
    level?: string;
  };
}

interface LearningGoal {
  goal_type: string;
  target_value: string | number;
}

interface CourseData {
  id: number;
  public_id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  is_free: boolean;
  price_cents: number;
  thumbnail_url: string;
  total_students: number;
  average_rating: number;
  tags?: string[];
  requirements?: string[];
  learning_objectives?: string[];
}

/**
 * Get user preferences and learning profile
 */
async function getUserLearningProfile(userId: number) {
  const supabase = await createAdminClient();
  
  try {
    // Get user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    // Get user's enrolled courses for category preferences
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('course_enrollment')
      .select(`
        course:course(category, level)
      `)
      .eq('user_id', userId)
      .eq('role', 'student');

    if (enrollmentError) {
      console.warn('Enrollment data unavailable:', enrollmentError);
    }

    // Extract preferences
    const preferences = profile.preferences || {};
    const interests = preferences.interests?.subFields || [];
    const broadField = preferences.interests?.broadField;
    
    // Get preferred categories from enrollment history
    const preferredCategories = enrollments 
      ? [...new Set(enrollments.map((e: any) => e.course?.category).filter(Boolean))]
      : [];

    // Get learning goals
    const { data: goals, error: goalsError } = await supabase
      .from('learning_goal')
      .select('goal_type, target_value')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_deleted', false);

    const learningGoals = goals ? goals.map((g: LearningGoal) => `${g.goal_type}: ${g.target_value}`) : [];

    return {
      interests: broadField ? [broadField, ...interests] : interests,
      preferred_categories: preferredCategories,
      skill_level: preferences.currentLevel || 'beginner',
      learning_goals: learningGoals,
      time_availability: preferences.timeConstraint || 'flexible',
      role: profile.role
    };

  } catch (error) {
    console.error('User profile error:', error);
    return {
      interests: [],
      preferred_categories: [],
      skill_level: 'beginner',
      learning_goals: [],
      time_availability: 'flexible',
      role: 'student'
    };
  }
}

/**
 * Generate course recommendations
 */
export async function generateCourseRecommendations(
  userId: number,
  options: {
    maxResults?: number;
    includeEnrolled?: boolean;
    categoryFilter?: string;
    levelFilter?: string;
    freeOnly?: boolean;
  } = {}
) {
  try {
    const {
      maxResults = 10,
      includeEnrolled = false,
      categoryFilter,
      levelFilter,
      freeOnly = false
    } = options;

    const supabase = await createAdminClient();
    
    // Get user learning profile
    const userProfile = await getUserLearningProfile(userId);
    
    // Get user's current enrollments to exclude
    let enrolledCourseIds: number[] = [];
    if (!includeEnrolled) {
      const { data: enrollments } = await supabase
        .from('course_enrollment')
        .select('course_id')
        .eq('user_id', userId);
      enrolledCourseIds = enrollments?.map((e: any) => e.course_id) || [];
    }

    // Build course query
    let courseQuery = supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        description,
        category,
        level,
        is_free,
        price_cents,
        thumbnail_url,
        total_students,
        average_rating,
        tags,
        requirements,
        learning_objectives
      `)
      .eq('is_deleted', false)
      .eq('status', 'active')
      .eq('visibility', 'public');

    // Apply filters
    if (categoryFilter) {
      courseQuery = courseQuery.eq('category', categoryFilter);
    }
    if (levelFilter) {
      courseQuery = courseQuery.eq('level', levelFilter);
    }
    if (freeOnly) {
      courseQuery = courseQuery.eq('is_free', true);
    }
    if (enrolledCourseIds.length > 0) {
      courseQuery = courseQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
    }

    const { data: courses, error: courseError } = await courseQuery.limit(maxResults * 3); // Get more to allow filtering

    if (courseError) {
      throw new Error(`Course query error: ${courseError.message}`);
    }

    // Calculate recommendation scores
    const recommendations: CourseRecommendation[] = courses.map((course: any) => {
      let score = 0;
      const reasons: string[] = [];

      // Base score from ratings and popularity
      score += (course.average_rating || 0) * 0.1;
      score += Math.min((course.total_students || 0) / 1000, 1) * 0.1;

      // Interest matching
      const courseText = `${course.title} ${course.description} ${course.category}`.toLowerCase();
      let interestMatches = 0;
      userProfile.interests.forEach((interest: string) => {
        if (courseText.includes(interest.toLowerCase())) {
          interestMatches++;
          score += 0.3;
        }
      });
      if (interestMatches > 0) {
        reasons.push(`Matches your interests in ${userProfile.interests.slice(0, 2).join(', ')}`);
      }

      // Category preference
      if (userProfile.preferred_categories.includes(course.category)) {
        score += 0.2;
        reasons.push(`In your preferred category: ${course.category}`);
      }

      // Level appropriateness
      if (course.level === userProfile.skill_level) {
        score += 0.2;
        reasons.push(`Appropriate for your ${course.level} level`);
      } else if (
        (userProfile.skill_level === 'beginner' && course.level === 'intermediate') ||
        (userProfile.skill_level === 'intermediate' && course.level === 'advanced')
      ) {
        score += 0.1;
        reasons.push(`Next step from your ${userProfile.skill_level} level`);
      }

      // Free courses preference for students
      if (course.is_free && userProfile.role === 'student') {
        score += 0.1;
        reasons.push('Free course');
      }

      // Tags and objectives matching
      if (course.tags && Array.isArray(course.tags)) {
        const tagMatches = course.tags.some((tag: string) => 
          userProfile.interests.some((interest: string) => 
            tag.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (tagMatches) {
          score += 0.15;
          reasons.push('Matches your learning interests');
        }
      }

      // Ensure minimum reasons
      if (reasons.length === 0) {
        if (course.average_rating > 4) {
          reasons.push('Highly rated course');
        }
        if (course.total_students > 500) {
          reasons.push('Popular course');
        }
        if (reasons.length === 0) {
          reasons.push('Recommended for you');
        }
      }

      return {
        course_id: course.id,
        public_id: course.public_id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        is_free: course.is_free,
        price_cents: course.price_cents,
        thumbnail_url: course.thumbnail_url,
        total_students: course.total_students,
        average_rating: course.average_rating,
        recommendation_score: Math.round(score * 100) / 100,
        recommendation_reasons: reasons
      };
    });

    // Sort by recommendation score and return top results
    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);
    
    return {
      success: true,
      userId: userId,
      userProfile: userProfile,
      totalRecommendations: recommendations.length,
      recommendations: recommendations.slice(0, maxResults)
    };

  } catch (error) {
    console.error('Course recommendation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: userId
    };
  }
}

/**
 * Get similar courses to a given course
 */
export async function getSimilarCourses(
  courseId: number,
  options: {
    maxResults?: number;
    userId?: number;
  } = {}
) {
  try {
    const { maxResults = 5, userId } = options;
    const supabase = await createAdminClient();
    
    // Get the source course details
    const { data: sourceCourse, error: sourceError } = await supabase
      .from('course')
      .select('category, level, tags, title, description')
      .eq('id', courseId)
      .single();

    if (sourceError) {
      throw new Error(`Source course error: ${sourceError.message}`);
    }

    // Find similar courses
    let similarQuery = supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        description,
        category,
        level,
        is_free,
        price_cents,
        thumbnail_url,
        average_rating,
        total_students,
        tags
      `)
      .eq('is_deleted', false)
      .eq('status', 'active')
      .eq('visibility', 'public')
      .neq('id', courseId);

    // Prioritize same category
    if (sourceCourse.category) {
      similarQuery = similarQuery.eq('category', sourceCourse.category);
    }

    const { data: courses, error: coursesError } = await similarQuery.limit(maxResults * 2);

    if (coursesError) {
      throw new Error(`Similar courses error: ${coursesError.message}`);
    }

    // Calculate similarity scores
    const similarities = courses.map((course: any) => {
      let score = 0;

      // Same category
      if (course.category === sourceCourse.category) score += 0.4;
      
      // Same level
      if (course.level === sourceCourse.level) score += 0.3;
      
      // Tag overlap
      if (course.tags && sourceCourse.tags) {
        const tagOverlap = course.tags.filter((tag: string) => 
          sourceCourse.tags.includes(tag)
        ).length;
        score += (tagOverlap / Math.max(course.tags.length, sourceCourse.tags.length)) * 0.3;
      }

      // Quality indicators
      score += (course.average_rating || 0) * 0.05;
      score += Math.min((course.total_students || 0) / 1000, 1) * 0.05;

      return {
        ...course,
        similarity_score: Math.round(score * 100) / 100
      };
    });

    // Sort by similarity and return top results
    similarities.sort((a: any, b: any) => b.similarity_score - a.similarity_score);
    
    return {
      success: true,
      sourceCourseId: courseId,
      totalSimilar: similarities.length,
      recommendations: similarities.slice(0, maxResults)
    };

  } catch (error) {
    console.error('Similar courses error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sourceCourseId: courseId
    };
  }
}

/**
 * AI Tool definition for Course Recommendations
 */
export const courseRecommendationTool = new DynamicTool({
  name: "course_recommendations",
  description: `Generate personalized course recommendations based on user's learning profile, interests, and history.
  
Use this when users ask about:
- Course recommendations or suggestions
- What to learn next
- Courses matching their interests or goals
- Similar courses to ones they like
- Learning path suggestions

Input should be a JSON string with:
{
  "recommendationType": "personalized" | "similar" | "category",
  "sourceCourseId": number (optional, for similar type),
  "category": string (optional filter),
  "level": "beginner" | "intermediate" | "advanced" (optional filter),
  "freeOnly": boolean (optional, default false),
  "maxResults": number (optional, 1-20, default 5)
}`,
  
  func: async (input: string, runManager?: any) => {
    try {
      const parameters = JSON.parse(input);
      const { 
        recommendationType = 'personalized', 
        sourceCourseId, 
        category, 
        level, 
        freeOnly = false, 
        maxResults = 5,
        userId
      } = parameters;

      let results: any = {};

      switch (recommendationType) {
        case 'similar':
          if (!sourceCourseId) {
            return JSON.stringify({
              success: false,
              error: "Source course ID required for similar recommendations",
              message: "Please specify a course to find similar courses for"
            });
          }
          results = await getSimilarCourses(sourceCourseId, { maxResults, userId });
          break;

        case 'personalized':
        default:
          if (!userId) {
            return JSON.stringify({
              success: false,
              error: "User authentication required for personalized recommendations",
              message: "Please log in to get personalized course recommendations"
            });
          }
          results = await generateCourseRecommendations(userId, {
            maxResults,
            categoryFilter: category,
            levelFilter: level,
            freeOnly
          });
          break;
      }

      if (!results.success) {
        return JSON.stringify({
          success: false,
          error: results.error,
          message: `Course recommendations failed: ${results.error}`
        });
      }

      // Format results for AI response
      const formattedResults = results.recommendations.map((rec: any) => ({
        id: rec.course_id || rec.id,
        title: rec.title,
        description: rec.description?.substring(0, 200) + (rec.description?.length > 200 ? "..." : ""),
        category: rec.category,
        level: rec.level,
        isFree: rec.is_free,
        price: rec.is_free ? "Free" : `$${(rec.price_cents / 100).toFixed(2)}`,
        rating: rec.average_rating,
        students: rec.total_students,
        score: rec.recommendation_score || rec.similarity_score,
        reasons: rec.recommendation_reasons || [`Similar to source course`]
      }));

      return JSON.stringify({
        success: true,
        recommendationType: recommendationType,
        userId: userId,
        totalRecommendations: results.totalRecommendations || results.totalSimilar,
        userProfile: results.userProfile,
        recommendations: formattedResults,
        message: `Generated ${formattedResults.length} course recommendations`
      }, null, 2);

    } catch (error) {
      console.error('Course recommendation tool error:', error);
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with at least userId parameter.';
      }
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
});

/**
 * Get user's embedding vectors for similarity matching
 */
async function getUserEmbeddingVectors(userId: number) {
  const supabase = await createAdminClient();
  
  try {
    // Get user's embedding data from profiles
    const { data: userEmbedding, error } = await supabase
      .from('embeddings')
      .select('embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding')
      .eq('content_type', 'profile')
      .eq('content_id', userId)
      .single();

    if (error) {
      console.warn('User embedding not found:', error);
      return null;
    }

    return userEmbedding;
  } catch (error) {
    console.error('Error fetching user embeddings:', error);
    return null;
  }
}

/**
 * Generate community post recommendations using embedding similarity
 */
export async function generateCommunityPostRecommendations(
  userId: number,
  options: {
    maxResults?: number;
    excludeOwnPosts?: boolean;
    groupFilter?: number;
    includePrivateGroups?: boolean;
  } = {}
) {
  try {
    const {
      maxResults = 10,
      excludeOwnPosts = true,
      groupFilter,
      includePrivateGroups = false
    } = options;

    const supabase = await createAdminClient();
    
    // Get user's embedding vectors
    const userEmbedding = await getUserEmbeddingVectors(userId);
    
    // Get user profile for additional matching
    const userProfile = await getUserLearningProfile(userId);
    
    // Build post query
    let postQuery = supabase
      .from('community_post')
      .select(`
        id,
        public_id,
        title,
        body,
        author_id,
        group_id,
        created_at,
        community_group:group_id(
          name,
          visibility,
          member_count
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Apply filters
    if (excludeOwnPosts) {
      postQuery = postQuery.neq('author_id', userId);
    }
    if (groupFilter) {
      postQuery = postQuery.eq('group_id', groupFilter);
    }
    if (!includePrivateGroups) {
      // Only get posts from public groups or no group
      postQuery = postQuery.or('group_id.is.null,community_group.visibility.eq.public');
    }

    const { data: posts, error: postsError } = await postQuery.limit(maxResults * 3);

    if (postsError) {
      throw new Error(`Posts query error: ${postsError.message}`);
    }

    // Get embeddings for all posts
    const postIds = posts.map(p => p.id);
    const { data: postEmbeddings, error: embeddingsError } = await supabase
      .from('embeddings')
      .select('content_id, embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding')
      .eq('content_type', 'post')
      .in('content_id', postIds);

    if (embeddingsError) {
      console.warn('Post embeddings error:', embeddingsError);
    }

    // Create embedding map for quick lookup
    const embeddingMap = new Map();
    if (postEmbeddings) {
      postEmbeddings.forEach(emb => {
        embeddingMap.set(emb.content_id, emb);
      });
    }

    // Calculate recommendation scores
    const recommendations: CommunityPostRecommendation[] = posts.map((post: any) => {
      let score = 0;
      let embeddingSimilarity = 0;
      const reasons: string[] = [];

      // Get post embedding
      const postEmbedding = embeddingMap.get(post.id);
      
      // 40% weight from embedding similarity
      if (userEmbedding && postEmbedding) {
        embeddingSimilarity = calculateDualEmbeddingSimilarity(userEmbedding, postEmbedding);
        if (embeddingSimilarity > 0.1) { // Only count if meaningful similarity
          score += embeddingSimilarity * 0.4;
          reasons.push('Similar to your interests based on content analysis');
        }
      }

      // 20% weight from recency
      const daysSincePost = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - (daysSincePost / 30)); // Decay over 30 days
      score += recencyScore * 0.2;
      if (daysSincePost < 3) {
        reasons.push('Recent post');
      }

      // 20% weight from group popularity/activity
      const groupScore = post.community_group ? 
        Math.min((post.community_group.member_count || 0) / 100, 1) * 0.2 : 0.1;
      score += groupScore;
      if (post.community_group && post.community_group.member_count > 50) {
        reasons.push(`Popular in ${post.community_group.name} community`);
      }

      // 10% weight from content quality (length, formatting)
      const contentLength = (post.title?.length || 0) + (post.body?.length || 0);
      const qualityScore = Math.min(contentLength / 500, 1) * 0.1; // Normalize to 500 chars
      score += qualityScore;
      if (contentLength > 200) {
        reasons.push('Well-detailed post');
      }

      // 10% weight from interest matching (text-based)
      if (userProfile.interests.length > 0) {
        const postText = `${post.title || ''} ${post.body || ''}`.toLowerCase();
        let interestMatches = 0;
        userProfile.interests.forEach((interest: string) => {
          if (postText.includes(interest.toLowerCase())) {
            interestMatches++;
          }
        });
        if (interestMatches > 0) {
          score += (interestMatches / userProfile.interests.length) * 0.1;
          reasons.push(`Matches your interests in ${userProfile.interests.slice(0, 2).join(', ')}`);
        }
      }

      // Ensure minimum reasons
      if (reasons.length === 0) {
        reasons.push('Recommended based on your activity');
      }

      return {
        post_id: post.id,
        public_id: post.public_id,
        title: post.title || 'Untitled',
        body: post.body || '',
        author_id: post.author_id,
        group_id: post.group_id,
        created_at: post.created_at,
        recommendation_score: Math.round(score * 100) / 100,
        embedding_similarity: embeddingSimilarity,
        recommendation_reasons: reasons
      };
    });

    // Sort by recommendation score and return top results
    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);
    
    return {
      success: true,
      userId: userId,
      userProfile: userProfile,
      totalRecommendations: recommendations.length,
      recommendations: recommendations.slice(0, maxResults)
    };

  } catch (error) {
    console.error('Community post recommendation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: userId
    };
  }
}

/**
 * Generate community group recommendations using embedding similarity
 */
export async function generateCommunityGroupRecommendations(
  userId: number,
  options: {
    maxResults?: number;
    excludeJoinedGroups?: boolean;
    visibilityFilter?: 'public' | 'private';
  } = {}
) {
  try {
    const {
      maxResults = 10,
      excludeJoinedGroups = true,
      visibilityFilter = 'public'
    } = options;

    const supabase = await createAdminClient();
    
    // Get user's embedding vectors
    const userEmbedding = await getUserEmbeddingVectors(userId);
    
    // Get user profile for additional matching
    const userProfile = await getUserLearningProfile(userId);
    
    // Get user's joined groups to exclude
    let joinedGroupIds: number[] = [];
    if (excludeJoinedGroups) {
      const { data: memberships } = await supabase
        .from('community_group_member')
        .select('group_id')
        .eq('user_id', userId);
      joinedGroupIds = memberships?.map((m: any) => m.group_id) || [];
    }

    // Build group query
    let groupQuery = supabase
      .from('community_group')
      .select(`
        id,
        public_id,
        name,
        description,
        visibility,
        member_count,
        post_count,
        created_at
      `)
      .eq('is_deleted', false);

    // Apply filters
    if (visibilityFilter) {
      groupQuery = groupQuery.eq('visibility', visibilityFilter);
    }
    if (joinedGroupIds.length > 0) {
      groupQuery = groupQuery.not('id', 'in', `(${joinedGroupIds.join(',')})`);
    }

    const { data: groups, error: groupsError } = await groupQuery.limit(maxResults * 3);

    if (groupsError) {
      throw new Error(`Groups query error: ${groupsError.message}`);
    }

    // Get embeddings for all groups
    const groupIds = groups.map(g => g.id);
    const { data: groupEmbeddings, error: embeddingsError } = await supabase
      .from('embeddings')
      .select('content_id, embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding')
      .eq('content_type', 'community_group')
      .in('content_id', groupIds);

    if (embeddingsError) {
      console.warn('Group embeddings error:', embeddingsError);
    }

    // Create embedding map for quick lookup
    const embeddingMap = new Map();
    if (groupEmbeddings) {
      groupEmbeddings.forEach(emb => {
        embeddingMap.set(emb.content_id, emb);
      });
    }

    // Calculate recommendation scores
    const recommendations: CommunityGroupRecommendation[] = groups.map((group: any) => {
      let score = 0;
      let embeddingSimilarity = 0;
      const reasons: string[] = [];

      // Get group embedding
      const groupEmbedding = embeddingMap.get(group.id);
      
      // 40% weight from embedding similarity
      if (userEmbedding && groupEmbedding) {
        embeddingSimilarity = calculateDualEmbeddingSimilarity(userEmbedding, groupEmbedding);
        if (embeddingSimilarity > 0.1) { // Only count if meaningful similarity
          score += embeddingSimilarity * 0.4;
          reasons.push('Matches your learning interests and activity');
        }
      }

      // 25% weight from group activity and popularity
      const memberScore = Math.min((group.member_count || 0) / 100, 1) * 0.15;
      const postScore = Math.min((group.post_count || 0) / 50, 1) * 0.1;
      score += memberScore + postScore;
      if (group.member_count > 20) {
        reasons.push(`Active community with ${group.member_count} members`);
      }
      if (group.post_count > 10) {
        reasons.push('Regular discussions and content');
      }

      // 20% weight from interest matching (text-based)
      if (userProfile.interests.length > 0) {
        const groupText = `${group.name || ''} ${group.description || ''}`.toLowerCase();
        let interestMatches = 0;
        userProfile.interests.forEach((interest: string) => {
          if (groupText.includes(interest.toLowerCase())) {
            interestMatches++;
          }
        });
        if (interestMatches > 0) {
          score += (interestMatches / userProfile.interests.length) * 0.2;
          reasons.push(`Focuses on ${userProfile.interests.slice(0, 2).join(' and ')}`);
        }
      }

      // 15% weight from group quality indicators
      const descriptionLength = group.description?.length || 0;
      const qualityScore = Math.min(descriptionLength / 200, 1) * 0.15;
      score += qualityScore;
      if (descriptionLength > 100) {
        reasons.push('Well-organized community');
      }

      // Ensure minimum reasons
      if (reasons.length === 0) {
        reasons.push('Recommended community for you');
      }

      return {
        group_id: group.id,
        public_id: group.public_id,
        name: group.name || 'Unnamed Group',
        description: group.description || '',
        visibility: group.visibility,
        member_count: group.member_count || 0,
        post_count: group.post_count || 0,
        recommendation_score: Math.round(score * 100) / 100,
        embedding_similarity: embeddingSimilarity,
        recommendation_reasons: reasons
      };
    });

    // Sort by recommendation score and return top results
    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);
    
    return {
      success: true,
      userId: userId,
      userProfile: userProfile,
      totalRecommendations: recommendations.length,
      recommendations: recommendations.slice(0, maxResults)
    };

  } catch (error) {
    console.error('Community group recommendation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: userId
    };
  }
}

/**
 * Export for tool registration
 */
export default courseRecommendationTool;
