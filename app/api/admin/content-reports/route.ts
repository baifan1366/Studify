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
    
    // Parse filters
    const contentType = searchParams.get('content_type') || 'all';
    const timePeriod = searchParams.get('time_period') || 'all';
    const hasReports = searchParams.get('has_reports');
    const minReports = parseInt(searchParams.get('min_reports') || '0');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const offset = (page - 1) * limit;
    
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
    
    // Collect all content with reports and engagement data
    const contentItems: any[] = [];
    
    // Fetch courses if needed
    if (contentType === 'all' || contentType === 'course') {
      let courseQuery = supabaseServer
        .from('course')
        .select(`
          id,
          title,
          description,
          tutor_id,
          created_at,
          updated_at,
          status,
          tutor_profile:profiles!tutor_id(id, full_name, avatar_url)
        `);
      
      // Apply time filter
      if (timeFilter) {
        courseQuery = courseQuery.gte('created_at', timeFilter);
      }
      
      // Apply search filter
      if (search) {
        courseQuery = courseQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      const { data: courses } = await courseQuery.limit(500);
      
      if (courses) {
        // Get report counts for courses
        const courseIds = courses.map(c => c.id);
        const { data: reportCounts } = await supabaseServer
          .from('report')
          .select('target_id, count:id.count()')
          .eq('target_type', 'course')
          .eq('status', 'pending')
          .in('target_id', courseIds.map(id => id.toString()));
        
        const reportCountMap = new Map(
          reportCounts?.map(r => [parseInt(r.target_id), r.count]) || []
        );
        
        courses.forEach(course => {
          const reportCount = reportCountMap.get(course.id) || 0;
          
          // Apply report filters
          if (hasReports === 'true' && reportCount === 0) return;
          if (hasReports === 'false' && reportCount > 0) return;
          if (minReports > 0 && reportCount < minReports) return;
          
          contentItems.push({
            id: course.id,
            type: 'course',
            title: course.title,
            content: course.description,
            author_id: course.tutor_id,
            created_at: course.created_at,
            updated_at: course.updated_at,
            status: course.status,
            author_profile: course.tutor_profile,
            report_count: reportCount,
            comment_count: 0,
            reaction_count: 0,
          });
        });
      }
    }
    
    // Fetch community posts if needed
    if (contentType === 'all' || contentType === 'post') {
      let postQuery = supabaseServer
        .from('community_post')
        .select(`
          id,
          title,
          body,
          user_id,
          created_at,
          updated_at,
          status,
          author_profile:profiles!user_id(id, full_name, avatar_url)
        `);
      
      // Apply time filter
      if (timeFilter) {
        postQuery = postQuery.gte('created_at', timeFilter);
      }
      
      // Apply search filter
      if (search) {
        postQuery = postQuery.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      }
      
      const { data: posts } = await postQuery.limit(500);
        
      if (posts) {
        // Get engagement counts
        const postIds = posts.map(p => p.id);
        
        const [commentCounts, reactionCounts, reportCounts] = await Promise.all([
          supabaseServer
            .from('community_comment')
            .select('post_id, count:id.count()')
            .in('post_id', postIds),
          supabaseServer
            .from('community_reaction')
            .select('post_id, count:id.count()')
            .in('post_id', postIds),
          supabaseServer
            .from('report')
            .select('target_id, count:id.count()')
            .eq('target_type', 'post')
            .eq('status', 'pending')
            .in('target_id', postIds.map(id => id.toString()))
        ]);
        
        const commentCountMap = new Map(commentCounts.data?.map(c => [c.post_id, c.count]) || []);
        const reactionCountMap = new Map(reactionCounts.data?.map(r => [r.post_id, r.count]) || []);
        const reportCountMap = new Map(reportCounts.data?.map(r => [parseInt(r.target_id), r.count]) || []);
        
        posts.forEach(post => {
          const reportCount = reportCountMap.get(post.id) || 0;
          
          // Apply report filters
          if (hasReports === 'true' && reportCount === 0) return;
          if (hasReports === 'false' && reportCount > 0) return;
          if (minReports > 0 && reportCount < minReports) return;
          
          contentItems.push({
            id: post.id,
            type: 'post',
            title: post.title,
            content: post.body,
            author_id: post.user_id,
            created_at: post.created_at,
            updated_at: post.updated_at,
            status: post.status,
            author_profile: post.author_profile,
            report_count: reportCount,
            comment_count: commentCountMap.get(post.id) || 0,
            reaction_count: reactionCountMap.get(post.id) || 0,
          });
        });
      }
    }
    
    // Fetch community comments if needed
    if (contentType === 'all' || contentType === 'comment') {
      let commentQuery = supabaseServer
        .from('community_comment')
        .select(`
          id,
          body,
          user_id,
          created_at,
          updated_at,
          author_profile:profiles!user_id(id, full_name, avatar_url)
        `);
      
      // Apply time filter
      if (timeFilter) {
        commentQuery = commentQuery.gte('created_at', timeFilter);
      }
      
      // Apply search filter
      if (search) {
        commentQuery = commentQuery.ilike('body', `%${search}%`);
      }
      
      const { data: comments } = await commentQuery.limit(500);
        
      if (comments) {
        // Get engagement counts
        const commentIds = comments.map(c => c.id);
        
        const [reactionCounts, reportCounts] = await Promise.all([
          supabaseServer
            .from('community_reaction')
            .select('comment_id, count:id.count()')
            .in('comment_id', commentIds),
          supabaseServer
            .from('report')
            .select('target_id, count:id.count()')
            .eq('target_type', 'comment')
            .eq('status', 'pending')
            .in('target_id', commentIds.map(id => id.toString()))
        ]);
        
        const reactionCountMap = new Map(reactionCounts.data?.map(r => [r.comment_id, r.count]) || []);
        const reportCountMap = new Map(reportCounts.data?.map(r => [parseInt(r.target_id), r.count]) || []);
        
        comments.forEach(comment => {
          const reportCount = reportCountMap.get(comment.id) || 0;
          
          // Apply report filters
          if (hasReports === 'true' && reportCount === 0) return;
          if (hasReports === 'false' && reportCount > 0) return;
          if (minReports > 0 && reportCount < minReports) return;
          
          contentItems.push({
            id: comment.id,
            type: 'comment',
            title: null,
            content: comment.body,
            body: comment.body,
            author_id: comment.user_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            status: null,
            author_profile: comment.author_profile,
            report_count: reportCount,
            comment_count: 0,
            reaction_count: reactionCountMap.get(comment.id) || 0,
          });
        });
      }
    }
    
    // Apply additional filtering
    let filteredItems = contentItems;
    
    if (hasReports === 'true') {
      filteredItems = filteredItems.filter(item => item.report_count > 0);
    } else if (hasReports === 'false') {
      filteredItems = filteredItems.filter(item => item.report_count === 0);
    }
    
    if (minReports > 0) {
      filteredItems = filteredItems.filter(item => item.report_count >= minReports);
    }
    
    // Sort items
    filteredItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'report_count':
          aValue = a.report_count;
          bValue = b.report_count;
          break;
        case 'engagement':
          aValue = (a.comment_count || 0) + (a.reaction_count || 0);
          bValue = (b.comment_count || 0) + (b.reaction_count || 0);
          break;
        case 'author':
          aValue = a.author_profile?.full_name || '';
          bValue = b.author_profile?.full_name || '';
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Apply pagination
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limit);
    
    return NextResponse.json({
      data: paginatedItems,
      total,
      page,
      limit,
    });
    
  } catch (error) {
    console.error('[ADMIN_CONTENT_REPORTS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch content reports' },
      { status: 500 }
    );
  }
}
