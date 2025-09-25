import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authorize admin user
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    
    const supabaseServer = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const timePeriod = searchParams.get('time_period') || 'week';
    
    // Build time filter
    let timeFilter = '';
    if (timePeriod !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (timePeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      timeFilter = startDate.toISOString();
    }
    
    // Get trending posts (most engagement = comments + reactions)
    const { data: trendingPosts } = await supabaseServer
      .from('community_post')
      .select(`
        id,
        title,
        body,
        user_id,
        created_at,
        author_profile:profiles(id, full_name, avatar_url),
        comments:community_comment(count),
        reactions:community_reaction(count)
      `)
      .gte('created_at', timeFilter || '1970-01-01')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get trending courses (most enrollments/activity)
    const { data: trendingCourses } = await supabaseServer
      .from('course')
      .select(`
        id,
        title,
        description,
        tutor_id,
        created_at,
        status,
        tutor_profile:profiles(id, full_name, avatar_url),
        enrollments:course_enrollment(count)
      `)
      .eq('status', 'active')
      .gte('created_at', timeFilter || '1970-01-01')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get most reported content
    const { data: mostReported } = await supabaseServer
      .from('report')
      .select(`
        target_id,
        target_type,
        count:id.count(),
        target_course:course!inner(id, title, description, tutor_id, created_at, tutor_profile:profiles!inner(id, full_name, avatar_url)),
        target_post:community_post!inner(id, title, body, user_id, created_at, author_profile:profiles!inner(id, full_name, avatar_url)),
        target_comment:community_comment!inner(id, body, user_id, created_at, author_profile:profiles!inner(id, full_name, avatar_url))
      `)
      .eq('status', 'pending')
      .gte('created_at', timeFilter || '1970-01-01')
      .limit(10);
    
    // Process trending posts with engagement scores
    const processedTrendingPosts = trendingPosts?.map(post => {
      const commentCount = post.comments?.[0]?.count || 0;
      const reactionCount = post.reactions?.[0]?.count || 0;
      const engagementScore = commentCount + reactionCount;
      
      return {
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.body,
        author_id: post.user_id,
        created_at: post.created_at,
        author_profile: post.author_profile,
        comment_count: commentCount,
        reaction_count: reactionCount,
        report_count: 0,
        engagement_score: engagementScore,
      };
    }).sort((a, b) => b.engagement_score - a.engagement_score) || [];
    
    // Process trending courses
    const processedTrendingCourses = trendingCourses?.map((course: any) => ({
      id: course.id,
      type: 'course',
      title: course.title,
      content: course.description,
      author_id: course.tutor_id,
      created_at: course.created_at,
      status: course.status,
      author_profile: course.tutor_profile,
      comment_count: 0,
      reaction_count: 0,
      report_count: 0,
      enrollment_count: course.enrollments?.[0]?.count || 0,
    })).sort((a, b) => b.enrollment_count - a.enrollment_count) || [];
    
    // Process most reported content
    const processedMostReported = mostReported?.map(report => {
      let contentData: any = {
        id: report.target_id,
        type: report.target_type,
        created_at: new Date().toISOString(),
        report_count: report.count || 1,
      };
      
      if (report.target_type === 'course' && report.target_course && Array.isArray(report.target_course) && report.target_course.length > 0) {
        const course = report.target_course[0];
        contentData = {
          ...contentData,
          title: course.title,
          content: course.description,
          author_id: course.tutor_id,
          created_at: course.created_at,
          author_profile: Array.isArray(course.tutor_profile) && course.tutor_profile.length > 0 ? course.tutor_profile[0] : null,
        };
      } else if (report.target_type === 'post' && report.target_post && Array.isArray(report.target_post) && report.target_post.length > 0) {
        const post = report.target_post[0];
        contentData = {
          ...contentData,
          title: post.title,
          content: post.body,
          author_id: post.user_id,
          created_at: post.created_at,
          author_profile: Array.isArray(post.author_profile) && post.author_profile.length > 0 ? post.author_profile[0] : null,
        };
      } else if (report.target_type === 'comment' && report.target_comment && Array.isArray(report.target_comment) && report.target_comment.length > 0) {
        const comment = report.target_comment[0];
        contentData = {
          ...contentData,
          title: null,
          content: comment.body,
          body: comment.body,
          author_id: comment.user_id,
          created_at: comment.created_at,
          author_profile: Array.isArray(comment.author_profile) && comment.author_profile.length > 0 ? comment.author_profile[0] : null,
        };
      }
      
      return contentData;
    }).filter(item => item.title || item.content) || [];
    
    const trendingData = {
      trending_posts: processedTrendingPosts.slice(0, 10),
      trending_courses: processedTrendingCourses.slice(0, 10),
      most_reported: processedMostReported.slice(0, 10),
    };
    
    return NextResponse.json(trendingData);
    
  } catch (error) {
    console.error('[ADMIN_TRENDING_CONTENT_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending content' },
      { status: 500 }
    );
  }
}
