import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    // Authorize admin access
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const userId = authResult.sub;
    
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const groupId = searchParams.get('groupId');
    const authorId = searchParams.get('authorId');
    const hasReports = searchParams.get('hasReports') === 'true';

    // Build the query
    let query = supabase
      .from('community_post')
      .select(`
        id,
        public_id,
        title,
        body,
        slug,
        created_at,
        updated_at,
        is_deleted,
        author_id,
        group_id,
        author:profiles!community_post_author_id_fkey (
          id,
          user_id,
          full_name,
          email,
          avatar_url
        ),
        group:community_group!community_post_group_id_fkey (
          id,
          name,
          slug
        )
      `)
      .eq('is_deleted', false);

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    if (groupId) {
      query = query.eq('group_id', parseInt(groupId));
    }

    if (authorId) {
      query = query.eq('author_id', parseInt(authorId));
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching community posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch community posts' },
        { status: 500 }
      );
    }

    // Get stats for each post (comments, reactions, reports)
    const postsWithStats = await Promise.all(
      (posts || []).map(async (post) => {
        // Get comment count
        const { count: commentCount } = await supabase
          .from('community_comment')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('is_deleted', false);

        // Get reaction count
        const { count: reactionCount } = await supabase
          .from('community_reaction')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'post')
          .eq('target_id', post.id);

        // Get report count
        const { count: reportCount } = await supabase
          .from('report')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'post')
          .eq('target_id', post.id);

        return {
          ...post,
          comment_count: commentCount || 0,
          reaction_count: reactionCount || 0,
          total_reports: reportCount || 0,
        };
      })
    );

    // Filter by hasReports if needed
    let filteredPosts = postsWithStats;
    if (hasReports) {
      filteredPosts = postsWithStats.filter(post => (post.total_reports || 0) > 0);
    }

    // Sort by computed fields if needed
    if (sortBy === 'comment_count' || sortBy === 'reaction_count' || sortBy === 'total_reports') {
      filteredPosts.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return NextResponse.json({
      posts: filteredPosts,
      total: count || 0,
      page,
      limit,
    });

  } catch (error) {
    console.error('Admin community posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}