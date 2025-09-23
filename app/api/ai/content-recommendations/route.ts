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
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { aiResponse, questionContext, userId, maxRecommendations = 6 }: RecommendationRequest = await request.json();

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
    const recommendations = [
      ...courseRecommendations,
      ...postRecommendations,
      ...communityRecommendations
    ].slice(0, maxRecommendations);

    return NextResponse.json({
      success: true,
      recommendations,
      searchQuery,
      totalFound: recommendations.length
    });

  } catch (error) {
    console.error('Content recommendations error:', error);
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

// 提取关键词和主题
function extractKeywords(aiResponse: string, questionContext?: string): string {
  const combinedText = `${questionContext || ''} ${aiResponse}`.toLowerCase();
  
  // 移除常用词和标点
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
  
  // 提取关键技术术语和概念
  const words = combinedText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // 取前10个关键词

  return words.join(' ');
}

// 查找相似课程
async function findSimilarCourses(supabase: any, searchQuery: string, limit: number) {
  try {
    // 首先尝试基于标题和描述的文本搜索
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id,
        public_id,
        title,
        description,
        slug,
        difficulty_level,
        estimated_hours,
        category,
        tags,
        thumbnail_url,
        student_count
      `)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery.split(' ').join(',')}}`)
      .eq('status', 'published')
      .limit(limit);

    return courses?.map((course: any) => ({
      id: course.public_id,
      title: course.title,
      description: course.description?.substring(0, 120) + '...',
      type: 'course' as const,
      difficulty: course.difficulty_level,
      estimatedTime: course.estimated_hours ? `${course.estimated_hours}h` : undefined,
      thumbnail: course.thumbnail_url,
      slug: course.slug,
      stats: {
        views: course.student_count
      }
    })) || [];
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
