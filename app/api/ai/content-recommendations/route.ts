import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';
import { searchSimilarContentDual } from '@/lib/langChain/vectorstore';

interface RecommendationRequest {
  aiResponse?: string;
  questionContext?: string;
  userId?: number;
  maxRecommendations?: number;
  // Learning path specific fields
  learningGoal?: string;
  currentLevel?: string;
  timeConstraint?: string;
  recommendationType?: 'general' | 'learning_path';
}

export async function POST(request: NextRequest) {
  let maxRecommendations = 6; // 默认值放在外面，以便错误处理时使用
  
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const requestBody: RecommendationRequest = await request.json();
    const { 
      aiResponse, 
      questionContext, 
      userId, 
      learningGoal,
      currentLevel,
      timeConstraint,
      recommendationType = 'general'
    } = requestBody;
    maxRecommendations = requestBody.maxRecommendations || 6;

    // For learning path recommendations
    if (recommendationType === 'learning_path' && learningGoal) {
      const searchQuery = extractKeywords(learningGoal);
      const supabase = await createClient();
      
      const [courses, quizzes] = await Promise.all([
        findCoursesForLearningPath(supabase, searchQuery, currentLevel || 'beginner', 5),
        findQuizzesForLearningPath(supabase, searchQuery, currentLevel || 'beginner', 3)
      ]);

      return NextResponse.json({
        success: true,
        recommendations: {
          courses,
          quizzes
        },
        searchQuery,
        metadata: {
          learningGoal,
          currentLevel: currentLevel || 'beginner',
          timeConstraint,
          totalCourses: courses.length,
          totalQuizzes: quizzes.length
        }
      });
    }

    // For general content recommendations
    if (!aiResponse || aiResponse.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'AI response is required and must be substantial' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    const actualUserId = userId || parseInt(authResult.payload.sub);

    // 1. 提取关键词和主题
    const searchQuery = extractKeywords(aiResponse, questionContext);
    
    // 2. 获取基于embedding的相似内容
    const [courseRecommendations, postRecommendations, communityRecommendations] = await Promise.all([
      findSimilarCourses(supabase, searchQuery, Math.ceil(maxRecommendations * 0.3)),
      findSimilarPosts(supabase, searchQuery, Math.ceil(maxRecommendations * 0.4)),
      findSimilarCommunities(supabase, searchQuery, Math.ceil(maxRecommendations * 0.3))
    ]);

    // 3. 合并推荐结果
    let recommendations = [
      ...courseRecommendations,
      ...postRecommendations,
      ...communityRecommendations
    ].slice(0, maxRecommendations);

    // 4. 降级策略：如果没有找到推荐，返回热门内容
    if (recommendations.length === 0) {
      console.log('⚠️ No recommendations found, falling back to popular content');
      const fallbackRecommendations = await getFallbackRecommendations(supabase, maxRecommendations);
      recommendations = fallbackRecommendations;
    }

    return NextResponse.json({
      success: true,
      recommendations,
      searchQuery,
      totalFound: recommendations.length,
      isFallback: recommendations.length > 0 && courseRecommendations.length === 0 && postRecommendations.length === 0 && communityRecommendations.length === 0
    });

  } catch (error) {
    console.error('Content recommendations error:', error);
    
    // 即使出错，也尝试返回一些热门推荐
    try {
      const supabase = await createClient();
      const fallbackRecommendations = await getFallbackRecommendations(supabase, maxRecommendations);
      
      if (fallbackRecommendations.length > 0) {
        console.log('✅ Returning fallback recommendations despite error');
        return NextResponse.json({
          success: true,
          recommendations: fallbackRecommendations,
          searchQuery: 'popular',
          totalFound: fallbackRecommendations.length,
          isFallback: true,
          warning: 'Showing popular content due to processing error'
        });
      }
    } catch (fallbackError) {
      console.error('Fallback recommendations also failed:', fallbackError);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate recommendations',
        recommendations: [] // 返回空数组以防崩溃
      },
      { status: 500 }
    );
  }
}

// 提取关键词和主题 - 支持中英文
function extractKeywords(aiResponse: string, questionContext?: string): string {
  const combinedText = `${questionContext || ''} ${aiResponse}`;
  
  // 检测文本是否主要为中文
  const chineseCharCount = (combinedText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalCharCount = combinedText.length;
  const isChinese = chineseCharCount / totalCharCount > 0.3;
  
  if (isChinese) {
    // 中文处理：提取有意义的中文词组和关键字
    // 移除标点符号，保留中文、英文、数字
    const cleanText = combinedText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
    
    // 按空格或连续中文分段
    const segments: string[] = [];
    const chinesePattern = /[\u4e00-\u9fa5]+/g;
    const englishPattern = /[a-zA-Z0-9]+/g;
    
    // 提取中文片段（2-8个字）
    const chineseMatches = cleanText.match(chinesePattern) || [];
    chineseMatches.forEach(match => {
      if (match.length >= 2 && match.length <= 8) {
        segments.push(match);
      }
    });
    
    // 提取英文单词
    const englishMatches = cleanText.match(englishPattern) || [];
    englishMatches.forEach(match => {
      if (match.length > 2) {
        segments.push(match);
      }
    });
    
    // 去重并取前10个关键词
    const uniqueSegments = Array.from(new Set(segments)).slice(0, 10);
    return uniqueSegments.join(' ') || 'learning';
    
  } else {
    // 英文处理
    const textLower = combinedText.toLowerCase();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    const words = textLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);

    return words.join(' ') || 'learning';
  }
}

// 查找相似课程 - 使用 tsvector 全文搜索
async function findSimilarCourses(supabase: any, searchQuery: string, limit: number) {
  try {
    // 清理搜索查询
    const cleanQuery = searchQuery
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 1)
      .join(' & ');

    if (!cleanQuery) {
      console.log('⚠️ Empty course search query, using popular courses');
      const { data: popularCourses } = await supabase
        .from('course')
        .select(`
          id,
          public_id,
          title,
          description,
          slug,
          level,
          category,
          thumbnail_url,
          total_students,
          average_rating
        `)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('total_students', { ascending: false })
        .limit(limit);

      return popularCourses?.map((course: any) => ({
        id: course.public_id,
        title: course.title,
        description: course.description?.substring(0, 120) + '...' || '',
        type: 'course' as const,
        difficulty: course.level,
        thumbnail: course.thumbnail_url,
        slug: course.slug,
        stats: {
          students: course.total_students,
          rating: course.average_rating
        }
      })) || [];
    }

    console.log(`🔍 Searching courses with tsvector query: "${cleanQuery}"`);

    // 使用 tsvector 全文搜索
    // Note: RPC function expects snake_case parameters
    const { data: courses, error } = await supabase.rpc('search_courses', {
      search_query: cleanQuery,
      result_limit: limit
    });

    console.log(`[search_courses] RPC result:`, { 
      coursesCount: courses?.length || 0, 
      error: error?.message,
      errorDetails: error 
    });

    if (error) {
      console.error('Course tsvector search error:', error);
      // 降级到 ILIKE 搜索
      console.log('⚠️ Falling back to ILIKE search for courses');
      const keywords = searchQuery.split(' ').filter(k => k.length > 1);
      const searchConditions = keywords.map(keyword => 
        `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
      ).join(',');
      
      const { data: fallbackCourses } = await supabase
        .from('course')
        .select(`
          id,
          public_id,
          title,
          description,
          slug,
          level,
          thumbnail_url,
          total_students,
          average_rating
        `)
        .or(searchConditions)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('total_students', { ascending: false })
        .limit(limit);

      return fallbackCourses?.map((course: any) => ({
        id: course.public_id,
        title: course.title,
        description: course.description?.substring(0, 120) + '...' || '',
        type: 'course' as const,
        difficulty: course.level,
        thumbnail: course.thumbnail_url,
        slug: course.slug,
        stats: {
          students: course.total_students,
          rating: course.average_rating
        }
      })) || [];
    }

    console.log(`✅ Found ${courses?.length || 0} courses using tsvector search`);

    return courses?.map((course: any) => ({
      id: course.public_id,
      title: course.title,
      description: course.description?.substring(0, 120) + '...' || '',
      type: 'course' as const,
      difficulty: course.level,
      thumbnail: course.thumbnail_url,
      slug: course.slug,
      stats: {
        students: course.total_students,
        rating: course.average_rating
      },
      relevance: course.rank // tsvector 相关性分数
    })) || [];
  } catch (error) {
    console.error('Error finding similar courses:', error);
    return [];
  }
}

// 查找相似帖子 - 使用 tsvector 全文搜索
async function findSimilarPosts(supabase: any, searchQuery: string, limit: number) {
  try {
    // 清理搜索查询，移除特殊字符
    const cleanQuery = searchQuery
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 1)
      .join(' & '); // 使用 & 连接词，表示 AND 搜索

    if (!cleanQuery) {
      console.log('⚠️ Empty search query after cleaning, using fallback');
      // 如果查询为空，返回最新的热门帖子
      const { data: recentPosts } = await supabase
        .from('community_post')
        .select(`
          id,
          public_id,
          title,
          body,
          slug,
          created_at,
          author:profiles!community_post_author_id_fkey(display_name),
          group:community_group!community_post_group_id_fkey(slug, name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      return recentPosts?.map((post: any) => ({
        id: post.public_id,
        title: post.title || 'Untitled Post',
        description: post.body?.substring(0, 120) + '...' || '',
        type: 'post' as const,
        author: post.author?.display_name,
        slug: post.group?.slug ? `${post.group.slug}/${post.slug}` : post.slug,
        stats: {
          views: 0,
          likes: 0,
          comments: 0
        }
      })) || [];
    }

    console.log(`🔍 Searching posts with tsvector query: "${cleanQuery}"`);

    // 使用 tsvector 全文搜索
    // ts_rank 会根据相关性排序结果
    const { data: posts, error } = await supabase.rpc('search_community_posts', {
      search_query: cleanQuery,
      result_limit: limit
    });

    console.log(`[search_community_posts] RPC result:`, { 
      postsCount: posts?.length || 0, 
      error: error?.message,
      errorDetails: error 
    });

    if (error) {
      console.error('tsvector search error:', error);
      // 降级到 ILIKE 搜索
      console.log('⚠️ Falling back to ILIKE search');
      const keywords = searchQuery.split(' ').filter(k => k.length > 1);
      const searchConditions = keywords.map(keyword => 
        `title.ilike.%${keyword}%,body.ilike.%${keyword}%`
      ).join(',');
      
      const { data: fallbackPosts } = await supabase
        .from('community_post')
        .select(`
          id,
          public_id,
          title,
          body,
          slug,
          created_at,
          author:profiles!community_post_author_id_fkey(display_name),
          group:community_group!community_post_group_id_fkey(slug, name)
        `)
        .or(searchConditions)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      return fallbackPosts?.map((post: any) => ({
        id: post.public_id,
        title: post.title || 'Untitled Post',
        description: post.body?.substring(0, 120) + '...' || '',
        type: 'post' as const,
        author: post.author?.display_name,
        slug: post.group?.slug ? `${post.group.slug}/${post.slug}` : post.slug,
        stats: {
          views: 0,
          likes: 0,
          comments: 0
        }
      })) || [];
    }

    console.log(`✅ Found ${posts?.length || 0} posts using tsvector search`);

    return posts?.map((post: any) => ({
      id: post.public_id,
      title: post.title || 'Untitled Post',
      description: post.body?.substring(0, 120) + '...' || '',
      type: 'post' as const,
      author: post.author_name,
      slug: post.group_slug ? `${post.group_slug}/${post.slug}` : post.slug,
      stats: {
        views: 0,
        likes: 0,
        comments: 0
      },
      relevance: post.rank // tsvector 相关性分数
    })) || [];
  } catch (error) {
    console.error('Error finding similar posts:', error);
    return [];
  }
}

// 查找相似社区
async function findSimilarCommunities(supabase: any, searchQuery: string, limit: number) {
  try {
    const { data: communities } = await supabase
      .from('community_group')
      .select(`
        id,
        public_id,
        name,
        description,
        slug,
        tags,
        member_count,
        post_count,
        thumbnail_url
      `)
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery.split(' ').join(',')}}`)
      .eq('status', 'active')
      .order('member_count', { ascending: false })
      .limit(limit);

    return communities?.map((community: any) => ({
      id: community.public_id,
      title: community.name,
      description: community.description?.substring(0, 120) + '...',
      type: 'community' as const,
      thumbnail: community.thumbnail_url,
      slug: community.slug,
      stats: {
        members: community.member_count
      },
      tags: community.tags
    })) || [];
  } catch (error) {
    console.error('Error finding similar communities:', error);
    return [];
  }
}

// 降级推荐：返回热门内容
async function getFallbackRecommendations(supabase: any, limit: number) {
  try {
    console.log('🔄 Getting fallback recommendations (popular content)');
    
    // 获取热门课程（按学生数和评分排序）
    const { data: popularCourses } = await supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        description,
        slug,
        level,
        category,
        thumbnail_url,
        total_students,
        average_rating
      `)
      .eq('status', 'active')
      .eq('is_deleted', false)
      .eq('visibility', 'public')
      .order('total_students', { ascending: false })
      .order('average_rating', { ascending: false })
      .limit(Math.max(limit, 3)); // 至少获取3个

    const recommendations = popularCourses?.map((course: any) => ({
      id: course.public_id,
      title: course.title,
      description: course.description?.substring(0, 120) + '...',
      type: 'course' as const,
      difficulty: course.level,
      thumbnail: course.thumbnail_url,
      slug: course.slug,
      stats: {
        students: course.total_students,
        rating: course.average_rating
      },
      isFallback: true
    })) || [];

    console.log(`✅ Found ${recommendations.length} fallback recommendations`);
    return recommendations;
  } catch (error) {
    console.error('Error getting fallback recommendations:', error);
    // 如果连降级都失败了，返回一个空数组而不是崩溃
    return [];
  }
}

// Find courses for learning path with difficulty matching
async function findCoursesForLearningPath(
  supabase: any,
  searchQuery: string,
  currentLevel: string,
  limit: number
) {
  try {
    const difficultyMap: Record<string, string> = {
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced'
    };
    const targetDifficulty = difficultyMap[currentLevel.toLowerCase()] || 'beginner';

    const keywords = searchQuery.split(' ').filter(k => k.length > 0);
    let query = supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        description,
        slug,
        level,
        category,
        thumbnail_url,
        total_students,
        average_rating,
        owner_id,
        owner:profiles!course_owner_id_fkey(
          display_name,
          avatar_url
        )
      `)
      .eq('status', 'active')
      .eq('is_deleted', false)
      .eq('visibility', 'public');

    if (keywords.length > 0) {
      const searchConditions = keywords.map(keyword => 
        `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
      ).join(',');
      query = query.or(searchConditions);
    }

    const { data: courses } = await query
      .order('total_students', { ascending: false })
      .limit(limit * 2);

    if (!courses || courses.length === 0) {
      const { data: popularCourses } = await supabase
        .from('course')
        .select(`
          id,
          public_id,
          title,
          description,
          slug,
          level,
          thumbnail_url,
          total_students,
          average_rating,
          owner:profiles!course_owner_id_fkey(
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .eq('visibility', 'public')
        .order('total_students', { ascending: false })
        .limit(limit);
      
      return popularCourses?.map((course: any) => ({
        id: course.public_id,
        title: course.title,
        description: course.description?.substring(0, 150) + '...' || '',
        level: course.level || 'beginner',
        duration: undefined,
        thumbnail: course.thumbnail_url,
        slug: course.slug,
        instructor: course.owner?.display_name,
        stats: {
          students: course.total_students || 0,
          rating: course.average_rating || 0
        }
      })) || [];
    }

    const sortedCourses = courses.sort((a: any, b: any) => {
      const aDiffMatch = a.level === targetDifficulty ? 1 : 0;
      const bDiffMatch = b.level === targetDifficulty ? 1 : 0;
      if (aDiffMatch !== bDiffMatch) return bDiffMatch - aDiffMatch;
      return (b.total_students || 0) - (a.total_students || 0);
    });

    return sortedCourses.slice(0, limit).map((course: any) => ({
      id: course.public_id,
      title: course.title,
      description: course.description?.substring(0, 150) + '...' || '',
      level: course.level || 'beginner',
      duration: undefined,
      thumbnail: course.thumbnail_url,
      slug: course.slug,
      instructor: course.owner?.display_name,
      stats: {
        students: course.total_students || 0,
        rating: course.average_rating || 0
      }
    }));
  } catch (error) {
    console.error('Error finding courses for learning path:', error);
    return [];
  }
}

// Find quizzes for learning path with difficulty matching
async function findQuizzesForLearningPath(
  supabase: any,
  searchQuery: string,
  currentLevel: string,
  limit: number
) {
  try {
    const difficultyMap: Record<string, number> = {
      'beginner': 2,
      'intermediate': 3,
      'advanced': 4
    };
    const targetDifficulty = difficultyMap[currentLevel.toLowerCase()] || 2;

    const keywords = searchQuery.split(' ').filter(k => k.length > 0);
    let query = supabase
      .from('tutor_quiz')
      .select(`
        id,
        public_id,
        title,
        description,
        difficulty,
        estimated_time,
        question_count,
        subject:tutor_subjects(name),
        grade:tutor_grades(name),
        author:profiles!tutor_quiz_author_id_fkey(
          display_name,
          avatar_url
        )
      `)
      .eq('visibility', 'public');

    if (keywords.length > 0) {
      const searchConditions = keywords.map(keyword => 
        `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
      ).join(',');
      query = query.or(searchConditions);
    }

    const { data: quizzes } = await query
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (!quizzes || quizzes.length === 0) {
      const { data: recentQuizzes } = await supabase
        .from('tutor_quiz')
        .select(`
          id,
          public_id,
          title,
          description,
          difficulty,
          estimated_time,
          question_count,
          subject:tutor_subjects(name),
          grade:tutor_grades(name),
          author:profiles!tutor_quiz_author_id_fkey(
            display_name,
            avatar_url
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return recentQuizzes?.map((quiz: any) => ({
        id: quiz.public_id,
        title: quiz.title,
        description: quiz.description?.substring(0, 150) + '...' || '',
        difficulty: quiz.difficulty || 3,
        questions: quiz.question_count || 10,
        estimatedTime: quiz.estimated_time || 15,
        subject: quiz.subject?.name,
        grade: quiz.grade?.name,
        author: quiz.author?.display_name
      })) || [];
    }

    const sortedQuizzes = quizzes.sort((a: any, b: any) => {
      const aDiffDist = Math.abs((a.difficulty || 3) - targetDifficulty);
      const bDiffDist = Math.abs((b.difficulty || 3) - targetDifficulty);
      return aDiffDist - bDiffDist;
    });

    return sortedQuizzes.slice(0, limit).map((quiz: any) => ({
      id: quiz.public_id,
      title: quiz.title,
      description: quiz.description?.substring(0, 150) + '...' || '',
      difficulty: quiz.difficulty || 3,
      questions: quiz.question_count || 10,
      estimatedTime: quiz.estimated_time || 15,
      subject: quiz.subject?.name,
      grade: quiz.grade?.name,
      author: quiz.author?.display_name
    }));
  } catch (error) {
    console.error('Error finding quizzes for learning path:', error);
    return [];
  }
}
