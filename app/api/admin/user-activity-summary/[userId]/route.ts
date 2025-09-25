import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Authorize admin user
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult.sub;
    
    const supabaseServer = await createClient();
    const { searchParams } = request.nextUrl;
    const timePeriod = searchParams.get('time_period') || 'all';
    
    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, full_name, avatar_url, created_at, user_id')
      .eq('user_id', userId)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get content statistics
    const [coursesData, postsData, commentsData, reactionsGivenData, reactionsReceivedData] = await Promise.all([
      // Courses created
      supabaseServer
        .from('course')
        .select('id, title, created_at')
        .eq('tutor_id', userProfile.id)
        .gte('created_at', timeFilter || '1970-01-01')
        .order('created_at', { ascending: false }),
      
      // Posts created
      supabaseServer
        .from('community_post')
        .select('id, title, body, created_at')
        .eq('user_id', userProfile.id)
        .gte('created_at', timeFilter || '1970-01-01')
        .order('created_at', { ascending: false }),
      
      // Comments created
      supabaseServer
        .from('community_comment')
        .select('id, body, created_at, post_id')
        .eq('user_id', userProfile.id)
        .gte('created_at', timeFilter || '1970-01-01')
        .order('created_at', { ascending: false }),
      
      // Reactions given by user
      supabaseServer
        .from('community_reaction')
        .select('id, reaction_type, created_at')
        .eq('user_id', userProfile.id)
        .gte('created_at', timeFilter || '1970-01-01'),
      
      // Reactions received on user's content
      supabaseServer
        .from('community_reaction')
        .select(`
          id, 
          reaction_type, 
          created_at,
          post:community_post!inner(user_id),
          comment:community_comment!inner(user_id)
        `)
        .or(`post.user_id.eq.${userProfile.id},comment.user_id.eq.${userProfile.id}`)
        .gte('created_at', timeFilter || '1970-01-01'),
    ]);
    
    // Get reports made by user
    const { data: reportsMade } = await supabaseServer
      .from('report')
      .select(`
        id,
        public_id,
        reason,
        target_type,
        target_id,
        status,
        created_at
      `)
      .eq('reporter_id', userProfile.id)
      .gte('created_at', timeFilter || '1970-01-01')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get reports received on user's content
    const { data: reportsReceived } = await supabaseServer
      .from('report')
      .select(`
        id,
        public_id,
        reason,
        target_type,
        target_id,
        status,
        created_at,
        reporter_profile:profiles!reporter_id(full_name, avatar_url)
      `)
      .or(`target_id.eq.${userProfile.id}`)
      .gte('created_at', timeFilter || '1970-01-01')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Build recent activity from all content
    const recentActivity: any[] = [];
    
    // Add courses to recent activity
    coursesData.data?.forEach(course => {
      recentActivity.push({
        id: course.id,
        type: 'course',
        title: course.title,
        content: null,
        author_id: userProfile.id,
        created_at: course.created_at,
        author_profile: {
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
        },
      });
    });
    
    // Add posts to recent activity
    postsData.data?.forEach(post => {
      recentActivity.push({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.body,
        author_id: userProfile.id,
        created_at: post.created_at,
        author_profile: {
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
        },
      });
    });
    
    // Add comments to recent activity
    commentsData.data?.forEach(comment => {
      recentActivity.push({
        id: comment.id,
        type: 'comment',
        title: null,
        content: comment.body,
        body: comment.body,
        author_id: userProfile.id,
        created_at: comment.created_at,
        author_profile: {
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
        },
        post_id: comment.post_id,
      });
    });
    
    // Sort recent activity by date and limit
    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const activitySummary = {
      user_profile: {
        id: userId,
        full_name: userProfile.full_name,
        avatar_url: userProfile.avatar_url,
        created_at: userProfile.created_at,
      },
      
      content_stats: {
        total_courses: coursesData.data?.length || 0,
        total_posts: postsData.data?.length || 0,
        total_comments: commentsData.data?.length || 0,
        total_reactions_given: reactionsGivenData.data?.length || 0,
        total_reactions_received: reactionsReceivedData.data?.length || 0,
      },
      
      recent_activity: recentActivity.slice(0, 20),
      
      report_stats: {
        total_reports_made: reportsMade?.length || 0,
        total_reports_received: reportsReceived?.length || 0,
        recent_reports_made: reportsMade?.map(report => ({
          id: report.public_id || report.id.toString(),
          reason: report.reason,
          target_type: report.target_type,
          target_id: report.target_id,
          status: report.status,
          created_at: report.created_at,
        })) || [],
        recent_reports_received: reportsReceived?.map(report => ({
          id: report.public_id || report.id.toString(),
          reason: report.reason,
          target_type: report.target_type,
          target_id: report.target_id,
          status: report.status,
          created_at: report.created_at,
          reporter_profile: report.reporter_profile,
        })) || [],
      },
    };
    
    return NextResponse.json(activitySummary);
    
  } catch (error) {
    console.error('[ADMIN_USER_ACTIVITY_SUMMARY_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity summary' },
      { status: 500 }
    );
  }
}
