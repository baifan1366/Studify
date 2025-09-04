import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(
  request: Request,
  { params }: { params: { slug: string; postSlug: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;

  // Get user profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get group and check access
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id, visibility')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Check access for private groups
  if (group.visibility === 'private') {
    const { data: membership } = await supabaseClient
      .from('community_group_member')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  // Get post
  const { data: post } = await supabaseClient
    .from('community_post')
    .select('id')
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Get comments with author info
  const { data: comments, error } = await supabaseClient
    .from('community_comment')
    .select(`
      *,
      author:profiles ( display_name, avatar_url )
    `)
    .eq('post_id', post.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get reactions for all comments separately
  const commentIds = comments.map(comment => comment.id);
  const { data: allReactions } = await supabaseClient
    .from('community_reaction')
    .select('emoji, target_id')
    .eq('target_type', 'comment')
    .in('target_id', commentIds);

  // Group reactions by comment ID
  const reactionsByComment = (allReactions || []).reduce((acc: Record<number, Record<string, number>>, reaction) => {
    if (!acc[reaction.target_id]) {
      acc[reaction.target_id] = {};
    }
    acc[reaction.target_id][reaction.emoji] = (acc[reaction.target_id][reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  // Process reactions for each comment
  const processedComments = comments.map(comment => ({
    ...comment,
    reactions: reactionsByComment[comment.id] || {}
  }));

  return NextResponse.json(processedComments);
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string; postSlug: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = params;
  const { body, parent_id } = await request.json();

  if (!body || body.trim().length === 0) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
  }

  // Get user profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get group and check membership (must be member to comment)
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Check membership
  const { data: membership } = await supabaseClient
    .from('community_group_member')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', profile.id)
    .eq('is_deleted', false)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'You must be a group member to comment' }, { status: 403 });
  }

  // Get post
  const { data: post } = await supabaseClient
    .from('community_post')
    .select('id')
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // If parent_id is provided, verify it exists
  if (parent_id) {
    const { data: parentComment } = await supabaseClient
      .from('community_comment')
      .select('id')
      .eq('id', parent_id)
      .eq('post_id', post.id)
      .eq('is_deleted', false)
      .single();

    if (!parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }
  }

  // Create comment
  const { data: newComment, error } = await supabaseClient
    .from('community_comment')
    .insert({
      post_id: post.id,
      author_id: profile.id,
      body: body.trim(),
      parent_id: parent_id || null
    })
    .select(`
      *,
      author:profiles ( display_name, avatar_url )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newComment, { status: 201 });
}
