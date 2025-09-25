import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Authorize admin access
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }    
    const userId = authResult.sub;
    const supabase = await createClient();
    const postId = parseInt((await params).postId);
    const { searchParams } = new URL(request.url);

    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query
    let query = supabase
      .from('community_comment')
      .select(`
        id,
        public_id,
        body,
        created_at,
        updated_at,
        is_deleted,
        post_id,
        author_id,
        parent_id,
        author:profiles!community_comment_author_id_fkey (
          id,
          user_id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false);

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: comments, error, count } = await query;

    if (error) {
      console.error('Error fetching post comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Get stats for each comment (reactions, reports)
    const commentsWithStats = await Promise.all(
      (comments || []).map(async (comment) => {
        // Get reaction count
        const { count: reactionCount } = await supabase
          .from('community_reaction')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'comment')
          .eq('target_id', comment.id);

        // Get report count
        const { count: reportCount } = await supabase
          .from('report')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'comment')
          .eq('target_id', comment.id);

        return {
          ...comment,
          reaction_count: reactionCount || 0,
          total_reports: reportCount || 0,
        };
      })
    );

    // Sort by computed fields if needed
    if (sortBy === 'reaction_count' || sortBy === 'total_reports') {
      commentsWithStats.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return NextResponse.json({
      comments: commentsWithStats,
      total: count || 0,
      page,
      limit,
    });

  } catch (error) {
    console.error('Admin post comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
