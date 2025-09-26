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
    
    // Get most commented content
    let commentedQuery = supabaseServer
      .from('community_post')
      .select(`
        id,
        title,
        body,
        user_id,
        created_at,
        author_profile:profiles!user_id(id, full_name, avatar_url)
      `);
    
    if (timeFilter) {
      commentedQuery = commentedQuery.gte('created_at', timeFilter);
    }
    
    const { data: mostCommented } = await commentedQuery.limit(50);
    
    // Get most reacted content
    let reactedQuery = supabaseServer
      .from('community_post')
      .select(`
        id,
        title,
        body,
        user_id,
        created_at,
        author_profile:profiles!user_id(id, full_name, avatar_url)
      `);
    
    if (timeFilter) {
      reactedQuery = reactedQuery.gte('created_at', timeFilter);
    }
    
    const { data: mostReacted } = await reactedQuery.limit(50);
    
    // Get top creators (users with most content)
    const { data: topCreators } = await supabaseServer.rpc('get_top_creators', {
      time_filter: timeFilter || '1970-01-01',
      limit_count: 10
    }).select(`
      user_id,
      full_name,
      avatar_url,
      total_content,
      posts_count,
      comments_count,
      courses_count
    `);
    
    // If the RPC doesn't exist, create a manual query
    let creatorsData = topCreators;
    if (!topCreators) {
      // Manual aggregation for top creators
      const { data: creators } = await supabaseServer
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          posts:community_post(count),
          comments:community_comment(count),
          courses:course(count)
        `)
        .limit(10);
      
      creatorsData = creators?.map(creator => ({
        user_id: creator.id,
        full_name: creator.full_name,
        avatar_url: creator.avatar_url,
        posts_count: creator.posts?.[0]?.count || 0,
        comments_count: creator.comments?.[0]?.count || 0,
        courses_count: creator.courses?.[0]?.count || 0,
        total_content: (creator.posts?.[0]?.count || 0) + 
                      (creator.comments?.[0]?.count || 0) + 
                      (creator.courses?.[0]?.count || 0),
      })).sort((a, b) => b.total_content - a.total_content) || [];
    }
    
    // Get engagement counts for posts
    let commentCountsForMostCommented: any[] = [];
    let reactionCountsForMostReacted: any[] = [];
    
    if (mostCommented && mostCommented.length > 0) {
      const { data: commentCounts } = await supabaseServer
        .from('community_comment')
        .select('post_id, count:id.count()')
        .in('post_id', mostCommented.map(p => p.id));
      commentCountsForMostCommented = commentCounts || [];
    }
    
    if (mostReacted && mostReacted.length > 0) {
      const { data: reactionCounts } = await supabaseServer
        .from('community_reaction')
        .select('post_id, count:id.count()')
        .in('post_id', mostReacted.map(p => p.id));
      reactionCountsForMostReacted = reactionCounts || [];
    }
    
    const commentCountMap = new Map(commentCountsForMostCommented.map(c => [c.post_id, c.count]));
    const reactionCountMap = new Map(reactionCountsForMostReacted.map(r => [r.post_id, r.count]));
    
    // Transform data to match expected format
    const engagementStats = {
      most_commented: mostCommented?.map(item => ({
        id: item.id,
        type: 'post',
        title: item.title,
        content: item.body,
        author_id: item.user_id,
        created_at: item.created_at,
        author_profile: item.author_profile,
        comment_count: commentCountMap.get(item.id) || 0,
        reaction_count: 0,
        report_count: 0,
      })).sort((a, b) => b.comment_count - a.comment_count).slice(0, 10) || [],
      
      most_reacted: mostReacted?.map(item => ({
        id: item.id,
        type: 'post',
        title: item.title,
        content: item.body,
        author_id: item.user_id,
        created_at: item.created_at,
        author_profile: item.author_profile,
        comment_count: 0,
        reaction_count: reactionCountMap.get(item.id) || 0,
        report_count: 0,
      })).sort((a, b) => b.reaction_count - a.reaction_count).slice(0, 10) || [],
      
      top_creators: creatorsData || [],
    };
    
    return NextResponse.json(engagementStats);
    
  } catch (error) {
    console.error('[ADMIN_ENGAGEMENT_STATS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement statistics' },
      { status: 500 }
    );
  }
}
