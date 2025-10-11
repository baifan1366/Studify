import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';
import { searchSimilarContentDual } from '@/lib/langChain/vectorstore';

interface RecommendationRequest {
  aiResponse: string;
  questionContext?: string;
  userId?: number;
  maxRecommendations?: number;
}

export async function POST(request: NextRequest) {
  let maxRecommendations = 6; // 默认值放在外面，以便错误处理时使用
  
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const requestBody: RecommendationRequest = await request.json();
    const { aiResponse, questionContext, userId } = requestBody;
    maxRecommendations = requestBody.maxRecommendations || 6;

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

// 查找相似课程
async function findSimilarCourses(supabase: any, searchQuery: string, limit: number) {
  try {
    // 首先尝试基于标题和描述的文本搜索
    const { data: courses } = await supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        description,
        slug,
        difficulty_level,
        category,
        tags,
        thumbnail_url,
        student_count
      `)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery.split(' ').join(',')}}`)
      .eq('status', 'active')
      .eq('is_deleted', false)
      .limit(limit);

    const results = courses?.map((course: any) => ({
      id: course.public_id,
      title: course.title,
      description: course.description?.substring(0, 120) + '...',
      type: 'course' as const,
      difficulty: course.difficulty_level,
      thumbnail: course.thumbnail_url,
      slug: course.slug,
      stats: {
        students: course.student_count
      }
    })) || [];
    
    // 如果没有找到结果，尝试降级策略
    if (results.length === 0 && limit > 0) {
      console.log('⚠️ No matching courses found, trying popular courses');
      const { data: popularCourses } = await supabase
        .from('course')
        .select(`
          id,
          public_id,
          title,
          description,
          slug,
          difficulty_level,
          thumbnail_url,
          student_count
        `)
        .eq('status', 'active')
        .eq('is_deleted', false)
        .eq('visibility', 'public')
        .order('student_count', { ascending: false })
        .limit(Math.min(limit, 3));
      
      return popularCourses?.map((course: any) => ({
        id: course.public_id,
        title: course.title,
        description: course.description?.substring(0, 120) + '...',
        type: 'course' as const,
        difficulty: course.difficulty_level,
        thumbnail: course.thumbnail_url,
        slug: course.slug,
        stats: {
          students: course.student_count
        }
      })) || [];
    }
    
    return results;
  } catch (error) {
    console.error('Error finding similar courses:', error);
    return [];
  }
}

// 查找相似帖子
async function findSimilarPosts(supabase: any, searchQuery: string, limit: number) {
  try {
    const { data: posts } = await supabase
      .from('community_post')
      .select(`
        id,
        public_id,
        title,
        content,
        slug,
        view_count,
        like_count,
        comment_count,
        tags,
        author:profiles(display_name),
        group:community_group(slug)
      `)
      .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,tags.cs.{${searchQuery.split(' ').join(',')}}`)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    return posts?.map((post: any) => ({
      id: post.public_id,
      title: post.title,
      description: post.content?.substring(0, 120) + '...',
      type: 'post' as const,
      author: post.author?.display_name,
      slug: `${post.group?.slug}/${post.slug}`,
      stats: {
        views: post.view_count,
        likes: post.like_count,
        comments: post.comment_count
      },
      tags: post.tags
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
        difficulty_level,
        category,
        thumbnail_url,
        student_count,
        average_rating
      `)
      .eq('status', 'active')
      .eq('is_deleted', false)
      .eq('visibility', 'public')
      .order('student_count', { ascending: false })
      .order('average_rating', { ascending: false })
      .limit(Math.max(limit, 3)); // 至少获取3个

    const recommendations = popularCourses?.map((course: any) => ({
      id: course.public_id,
      title: course.title,
      description: course.description?.substring(0, 120) + '...',
      type: 'course' as const,
      difficulty: course.difficulty_level,
      thumbnail: course.thumbnail_url,
      slug: course.slug,
      stats: {
        students: course.student_count,
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
