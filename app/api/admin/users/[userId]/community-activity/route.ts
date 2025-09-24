import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/users/[userId]/community-activity - Get user's community activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = await params;
    const supabase = await createAdminClient();

    // Get user profile first to get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get user's posts
    const { data: posts } = await supabase
      .from('community_post')
      .select(`
        id,
        title,
        created_at,
        community_group!inner(
          slug,
          name
        )
      `)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get reaction and comment counts separately
    const postIds = (posts || []).map(p => p.id);
    const { data: reactionCounts } = postIds.length > 0 ? await supabase
      .from('community_reaction')
      .select('post_id')
      .in('post_id', postIds) : { data: [] };
    
    const { data: commentCounts } = postIds.length > 0 ? await supabase
      .from('community_comment')
      .select('post_id')
      .in('post_id', postIds)
      .eq('is_deleted', false) : { data: [] };

    // Count reactions and comments per post
    const reactionCountMap = (reactionCounts || []).reduce((acc, r) => {
      acc[r.post_id] = (acc[r.post_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const commentCountMap = (commentCounts || []).reduce((acc, c) => {
      acc[c.post_id] = (acc[c.post_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Get user's comments
    const { data: comments } = await supabase
      .from('community_comment')
      .select(`
        id,
        content,
        created_at,
        community_post!inner(
          title,
          community_group!inner(name)
        )
      `)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get user's reactions
    const { data: reactions } = await supabase
      .from('community_reaction')
      .select(`
        id,
        type,
        created_at,
        community_post!inner(
          title,
          community_group!inner(name)
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Format the data
    const formattedPosts = (posts || []).map(post => ({
      id: post.id,
      title: post.title,
      created_at: post.created_at,
      group_slug: (post as any).community_group?.slug || 'unknown',
      group_name: (post as any).community_group?.name || 'Unknown Group',
      reactions_count: reactionCountMap[post.id] || 0,
      comments_count: commentCountMap[post.id] || 0,
    }));

    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      post_title: (comment as any).community_post?.title || 'Unknown Post',
      group_name: (comment as any).community_post?.community_group?.name || 'Unknown Group',
    }));

    const formattedReactions = (reactions || []).map(reaction => ({
      id: reaction.id,
      type: reaction.type,
      created_at: reaction.created_at,
      post_title: (reaction as any).community_post?.title || 'Unknown Post',
      group_name: (reaction as any).community_post?.community_group?.name || 'Unknown Group',
    }));

    return NextResponse.json({
      posts: formattedPosts,
      comments: formattedComments,
      reactions: formattedReactions,
    });

  } catch (error) {
    console.error('Admin user community activity GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
