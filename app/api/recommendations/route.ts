import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

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
    
    // Get user's interests from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('learning_preferences, interests')
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

    // Calculate recommendations based on multiple factors
    const recommendations = calculateRecommendations(
      availableCourses || [],
      completedCourses,
      inProgressCourses,
      profile?.learning_preferences,
      profile?.interests
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

function calculateRecommendations(
  availableCourses: any[],
  completedCourses: any[],
  inProgressCourses: any[],
  learningPreferences: any,
  interests: string[]
) {
  return availableCourses.map(course => {
    let score = 0;
    
    // Category matching with completed courses
    const completedCategories = completedCourses.map(c => c.course?.category);
    if (completedCategories.includes(course.category)) {
      score += 30;
    }
    
    // Level progression logic
    const userLevels = completedCourses.map(c => c.course?.level);
    if (userLevels.includes('beginner') && course.level === 'intermediate') {
      score += 25;
    } else if (userLevels.includes('intermediate') && course.level === 'advanced') {
      score += 25;
    } else if (course.level === 'beginner' && completedCourses.length === 0) {
      score += 20;
    }
    
    // Interest matching
    const courseTagsLower = (course.tags || []).map((tag: string) => tag.toLowerCase());
    const userInterestsLower = (interests || []).map(interest => interest.toLowerCase());
    const matchingInterests = courseTagsLower.filter((tag: string) => 
      userInterestsLower.some(interest => interest.includes(tag) || tag.includes(interest))
    );
    score += matchingInterests.length * 15;
    
    // Learning preference matching
    if (learningPreferences?.preferred_difficulty === course.level) {
      score += 10;
    }
    
    // Prerequisites check
    if (course.requirements && course.requirements.length > 0) {
      const hasPrerequisites = course.requirements.every((req: string) =>
        completedCourses.some(c => 
          c.course?.title.toLowerCase().includes(req.toLowerCase()) ||
          c.course?.tags?.some((tag: string) => tag.toLowerCase().includes(req.toLowerCase()))
        )
      );
      if (hasPrerequisites) {
        score += 20;
      } else {
        score -= 10; // Penalize if prerequisites not met
      }
    }
    
    // Random factor for diversity
    score += Math.random() * 5;
    
    return {
      ...course,
      recommendation_score: Math.round(score),
      recommendation_reasons: getRecommendationReasons(course, completedCourses, interests)
    };
  }).sort((a, b) => b.recommendation_score - a.recommendation_score);
}

function getRecommendationReasons(course: any, completedCourses: any[], interests: string[]) {
  const reasons = [];
  
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
