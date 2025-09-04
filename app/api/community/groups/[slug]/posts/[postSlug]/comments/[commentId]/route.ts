import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string; postSlug: string; commentId: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug, commentId } = params;

  // Get user profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (!profile) {
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

  // Get comment and check ownership
  const { data: comment } = await supabaseClient
    .from('community_comment')
    .select('id, author_id')
    .eq('id', commentId)
    .eq('post_id', post.id)
    .eq('is_deleted', false)
    .single();

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Check if user can delete (author or group admin/owner)
  const canDelete = comment.author_id === profile.id;
  
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

  // Soft delete comment
  const { error } = await supabaseClient
    .from('community_comment')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Comment deleted successfully' });
}
