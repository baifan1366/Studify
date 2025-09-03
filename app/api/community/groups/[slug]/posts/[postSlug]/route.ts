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
  const { slug, postSlug } = params;

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
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
      return NextResponse.json({ error: 'Access denied. Join the group to view this post.' }, { status: 403 });
    }
  }

  // Get post
  const { data: post, error } = await supabaseClient
    .from('community_post')
    .select(`
      *,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility ),
      comments:community_comment ( 
        *,
        author:profiles ( display_name, avatar_url )
      ),
      reactions:community_reaction ( emoji, user_id )
    `)
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Process reactions
  const reactions = post.reactions.reduce((acc: Record<string, number>, reaction: { emoji: string }) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  const processedPost = {
    ...post,
    comments_count: post.comments.length,
    reactions,
  };

  return NextResponse.json(processedPost);
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string; postSlug: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = params;

  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get group
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Get post and check ownership/permissions
  const { data: post } = await supabaseClient
    .from('community_post')
    .select('id, author_id')
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Check if user can edit (author or group admin/owner)
  const canEdit = post.author_id === profile.id;
  
  if (!canEdit) {
    // Check if user is group admin/owner
    const { data: membership } = await supabaseClient
      .from('community_group_member')
      .select('role')
      .eq('group_id', group.id)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
  }

  // Update post
  const { data: updatedPost, error } = await supabaseClient
    .from('community_post')
    .update({ title, body })
    .eq('id', post.id)
    .select(`
      *,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updatedPost);
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string; postSlug: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = params;

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get group
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Get post and check ownership/permissions
  const { data: post } = await supabaseClient
    .from('community_post')
    .select('id, author_id')
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Check if user can delete (author or group admin/owner)
  const canDelete = post.author_id === profile.id;
  
  if (!canDelete) {
    // Check if user is group admin/owner
    const { data: membership } = await supabaseClient
      .from('community_group_member')
      .select('role')
      .eq('group_id', group.id)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
  }

  // Soft delete post
  const { error } = await supabaseClient
    .from('community_post')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', post.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Post deleted successfully' });
}
