import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

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
  const { emoji, target_type, target_id } = await request.json();

  if (!emoji || !target_type || !target_id) {
    return NextResponse.json({ error: 'Emoji, target_type, and target_id are required' }, { status: 400 });
  }

  if (!['post', 'comment'].includes(target_type)) {
    return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
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

  // Verify target exists
  if (target_type === 'post' && target_id !== post.id) {
    return NextResponse.json({ error: 'Invalid post target' }, { status: 400 });
  }

  if (target_type === 'comment') {
    const { data: comment } = await supabaseClient
      .from('community_comment')
      .select('id')
      .eq('id', target_id)
      .eq('post_id', post.id)
      .eq('is_deleted', false)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabaseClient
    .from('community_reaction')
    .select('id')
    .eq('user_id', profile.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .eq('emoji', emoji)
    .single();

  if (existingReaction) {
    // Remove existing reaction (toggle off)
    const { error } = await supabaseClient
      .from('community_reaction')
      .delete()
      .eq('id', existingReaction.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reaction removed', action: 'removed' });
  } else {
    // Add new reaction
    const { data: newReaction, error } = await supabaseClient
      .from('community_reaction')
      .insert({
        user_id: profile.id,
        target_type,
        target_id,
        emoji
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reaction added', action: 'added', reaction: newReaction }, { status: 201 });
  }
}
