import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const supabase = await createClient();
    
    // Get user's enrolled courses and progress
    const { data: enrolledCourses } = await supabase
      .from('course_progress')
      .select(`
        course_id,
        progress_pct,
        course:courses(
          id,
          title,
          category,
          level,
          tags,
          requirements
        )
      `)
      .eq('user_id', user.id);

    // Get user's completed courses
    const completedCourses = enrolledCourses?.filter(c => c.progress_pct >= 100) || [];
    const inProgressCourses = enrolledCourses?.filter(c => c.progress_pct < 100) || [];
    
    // Get user's interests and profile data from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, learning_preferences, interests, preferences')
      .eq('user_id', user.id)
      .single();

    // Get all available courses (not enrolled)
    const enrolledCourseIds = enrolledCourses?.map(c => c.course_id) || [];
    const { data: availableCourses } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        category,
        level,
        tags,
        requirements,
        price,
        thumbnail_url,
        tutor_id,
        profiles:tutor_id(display_name)
      `)
      .not('id', 'in', `(${enrolledCourseIds.join(',') || '0'})`)
      .eq('status', 'published')
      .limit(20);

    // Get user's embedding data for similarity matching
    const adminSupabase = await createAdminClient();
    const { data: userEmbedding } = await adminSupabase
      .from('embeddings')
      .select('embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding')
      .eq('content_type', 'profile')
      .eq('content_id', profile?.id || 0)
      .eq('status', 'completed')
      .maybeSingle();

    // Get course embeddings for similarity calculation
    const availableCourseIds = (availableCourses || []).map(c => c.id);
    const { data: courseEmbeddings } = availableCourseIds.length > 0 ? await adminSupabase
      .from('embeddings')
      .select('content_id, embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding')
      .eq('content_type', 'course')
      .in('content_id', availableCourseIds)
      .eq('status', 'completed') : { data: [] };

    // Calculate recommendations based on multiple factors (60% traditional + 40% embedding)
    const recommendations = await calculateRecommendationsWithEmbedding(
      availableCourses || [],
      completedCourses,
      inProgressCourses,
      profile?.learning_preferences,
      profile?.interests || profile?.preferences?.interests || [],
      userEmbedding,
      courseEmbeddings || [],
      adminSupabase
    );

    return NextResponse.json({
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      categories: {
        continue_learning: inProgressCourses.slice(0, 3),
        similar_to_completed: getSimilarCourses(availableCourses || [], completedCourses).slice(0, 3),
        trending: getTrendingCourses(availableCourses || []).slice(0, 3),
        for_you: getPersonalizedCourses(availableCourses || [], profile?.interests || []).slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

// Helper function to calculate cosine similarity between two embeddings
function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

async function calculateRecommendationsWithEmbedding(
  availableCourses: any[],
  completedCourses: any[],
  inProgressCourses: any[],
  learningPreferences: any,
  interests: string[],
  userEmbedding: any,
  courseEmbeddings: any[],
  adminSupabase: any
) {
  const courseEmbeddingMap = new Map();
  courseEmbeddings.forEach(embedding => {
    courseEmbeddingMap.set(embedding.content_id, embedding);
  });

  return availableCourses.map(course => {
    // 60% Traditional scoring
    let traditionalScore = 0;
    
    // Category matching with completed courses (18 points max)
    const completedCategories = completedCourses.map(c => c.course?.category);
    if (completedCategories.includes(course.category)) {
      traditionalScore += 18; // 30 * 0.6
    }
    
    // Level progression logic (15 points max)
    const userLevels = completedCourses.map(c => c.course?.level);
    if (userLevels.includes('beginner') && course.level === 'intermediate') {
      traditionalScore += 15; // 25 * 0.6
    } else if (userLevels.includes('intermediate') && course.level === 'advanced') {
      traditionalScore += 15; // 25 * 0.6
    } else if (course.level === 'beginner' && completedCourses.length === 0) {
      traditionalScore += 12; // 20 * 0.6
    }
    
    // Interest matching (9 points per match)
    const courseTagsLower = (course.tags || []).map((tag: string) => tag.toLowerCase());
    const userInterestsLower = (interests || []).map(interest => interest.toLowerCase());
    const matchingInterests = courseTagsLower.filter((tag: string) => 
      userInterestsLower.some(interest => interest.includes(tag) || tag.includes(interest))
    );
    traditionalScore += matchingInterests.length * 9; // 15 * 0.6
    
    // Learning preference matching (6 points max)
    if (learningPreferences?.preferred_difficulty === course.level) {
      traditionalScore += 6; // 10 * 0.6
    }
    
    // Prerequisites check (12 points bonus, -6 penalty)
    if (course.requirements && course.requirements.length > 0) {
      const hasPrerequisites = course.requirements.every((req: string) =>
        completedCourses.some(c => 
          c.course?.title.toLowerCase().includes(req.toLowerCase()) ||
          c.course?.tags?.some((tag: string) => tag.toLowerCase().includes(req.toLowerCase()))
        )
      );
      if (hasPrerequisites) {
        traditionalScore += 12; // 20 * 0.6
      } else {
        traditionalScore -= 6; // -10 * 0.6 (penalize if prerequisites not met)
      }
    }
    
    // 40% Embedding similarity scoring
    let embeddingScore = 0;
    const courseEmbedding = courseEmbeddingMap.get(course.id);
    
    if (userEmbedding && courseEmbedding) {
      let totalSimilarity = 0;
      let similarityCount = 0;
      
      // E5-Small similarity (weight: 0.4 in hybrid)
      if (userEmbedding.has_e5_embedding && 
          courseEmbedding.has_e5_embedding && 
          userEmbedding.embedding_e5_small && 
          courseEmbedding.embedding_e5_small) {
        const e5Similarity = cosineSimilarity(
          userEmbedding.embedding_e5_small, 
          courseEmbedding.embedding_e5_small
        );
        totalSimilarity += e5Similarity * 0.4;
        similarityCount += 0.4;
      }
      
      // BGE-M3 similarity (weight: 0.6 in hybrid)
      if (userEmbedding.has_bge_embedding && 
          courseEmbedding.has_bge_embedding && 
          userEmbedding.embedding_bge_m3 && 
          courseEmbedding.embedding_bge_m3) {
        const bgeSimilarity = cosineSimilarity(
          userEmbedding.embedding_bge_m3, 
          courseEmbedding.embedding_bge_m3
        );
        totalSimilarity += bgeSimilarity * 0.6;
        similarityCount += 0.6;
      }
      
      // Convert similarity to score (0-40 points for 40% weight)
      if (similarityCount > 0) {
        const avgSimilarity = totalSimilarity / similarityCount;
        embeddingScore = Math.max(0, avgSimilarity * 40); // Scale to 40 points max
      }
    }
    
    // Random factor for diversity (3 points max)
    const diversityScore = Math.random() * 3; // 5 * 0.6
    
    const totalScore = traditionalScore + embeddingScore + diversityScore;
    
    return {
      ...course,
      recommendation_score: Math.round(totalScore),
      traditional_score: Math.round(traditionalScore),
      embedding_score: Math.round(embeddingScore),
      embedding_similarity: embeddingScore / 40, // Store raw similarity (0-1)
      recommendation_reasons: getRecommendationReasonsWithEmbedding(
        course, completedCourses, interests, embeddingScore > 10
      )
    };
  }).sort((a, b) => b.recommendation_score - a.recommendation_score);
}

function getRecommendationReasonsWithEmbedding(
  course: any, 
  completedCourses: any[], 
  interests: string[], 
  hasHighEmbeddingSimilarity: boolean
) {
  const reasons = [];
  
  // Embedding-based reason (if high similarity)
  if (hasHighEmbeddingSimilarity) {
    reasons.push('Highly matches your learning profile and preferences');
  }
  
  const completedCategories = completedCourses.map(c => c.course?.category);
  if (completedCategories.includes(course.category)) {
    reasons.push(`Similar to courses you've completed in ${course.category}`);
  }
  
  const courseTagsLower = (course.tags || []).map((tag: string) => tag.toLowerCase());
  const userInterestsLower = (interests || []).map(interest => interest.toLowerCase());
  const matchingInterests = courseTagsLower.filter((tag: string) => 
    userInterestsLower.some(interest => interest.includes(tag) || tag.includes(interest))
  );
  
  if (matchingInterests.length > 0) {
    reasons.push(`Matches your interests: ${matchingInterests.join(', ')}`);
  }
  
  if (course.level === 'beginner' && completedCourses.length === 0) {
    reasons.push('Perfect for getting started');
  }
  
  if (reasons.length === 0) {
    reasons.push('Popular course in our catalog');
  }
  
  return reasons.slice(0, 2); // Limit to 2 reasons
}

// Keep the old function for backward compatibility
function getRecommendationReasons(course: any, completedCourses: any[], interests: string[]) {
  return getRecommendationReasonsWithEmbedding(course, completedCourses, interests, false);
}

function getSimilarCourses(availableCourses: any[], completedCourses: any[]) {
  if (completedCourses.length === 0) return [];
  
  const completedCategories = completedCourses.map(c => c.course?.category);
  return availableCourses
    .filter(course => completedCategories.includes(course.category))
    .slice(0, 5);
}

function getTrendingCourses(availableCourses: any[]) {
  // Simple trending logic - could be enhanced with actual enrollment data
  return availableCourses
    .sort(() => Math.random() - 0.5) // Random for now
    .slice(0, 5);
}

function getPersonalizedCourses(availableCourses: any[], interests: string[]) {
  if (!interests || interests.length === 0) return availableCourses.slice(0, 5);
  
  const interestsLower = interests.map(interest => interest.toLowerCase());
  return availableCourses
    .filter(course => {
      const courseTagsLower = (course.tags || []).map((tag: string) => tag.toLowerCase());
      return courseTagsLower.some((tag: string) => 
        interestsLower.some(interest => interest.includes(tag) || tag.includes(interest))
      );
    })
    .slice(0, 5);
}
