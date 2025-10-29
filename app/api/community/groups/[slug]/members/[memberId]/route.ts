import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * DELETE /api/community/groups/[slug]/members/[memberId]
 * Remove a member from the group (owner/admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, memberId } = await params;

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
    .select('id, owner_id')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Check if user is owner or admin
  const { data: userMembership } = await supabaseClient
    .from('community_group_member')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', profile.id)
    .eq('is_deleted', false)
    .single();

  if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Get member to remove
  const { data: memberToRemove } = await supabaseClient
    .from('community_group_member')
    .select('user_id, role')
    .eq('id', parseInt(memberId))
    .eq('group_id', group.id)
    .eq('is_deleted', false)
    .single();

  if (!memberToRemove) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Prevent removing the owner
  if (memberToRemove.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove group owner' }, { status: 400 });
  }

  // Prevent non-owners from removing admins
  if (userMembership.role !== 'owner' && memberToRemove.role === 'admin') {
    return NextResponse.json({ error: 'Only owner can remove admins' }, { status: 403 });
  }

  // Remove member (soft delete)
  const { error } = await supabaseClient
    .from('community_group_member')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', parseInt(memberId));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Member removed successfully' });
}
