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
    const { postId } = await params
    const postIdNumber = parseInt(postId);

    if (isNaN(postIdNumber)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Fetch post with relations
    const { data: post, error } = await supabase
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
      .eq('id', postIdNumber)
      .single();

    if (error || !post) {
      console.error('Error fetching post:', error);
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get stats for the post
    const [commentCountResult, reactionCountResult, reportCountResult] = await Promise.all([
      supabase
        .from('community_comment')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)
        .eq('is_deleted', false),
      supabase
        .from('community_reaction')
        .select('*', { count: 'exact', head: true })
        .eq('target_type', 'post')
        .eq('target_id', post.id),
      supabase
        .from('report')
        .select('*', { count: 'exact', head: true })
        .eq('target_type', 'post')
        .eq('target_id', post.id)
    ]);

    const postWithStats = {
      ...post,
      comment_count: commentCountResult.count || 0,
      reaction_count: reactionCountResult.count || 0,
      total_reports: reportCountResult.count || 0,
    };

    return NextResponse.json(postWithStats);

  } catch (error) {
    console.error('Admin community post details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
