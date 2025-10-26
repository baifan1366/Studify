import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug } = await params;

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get group details
  const { data: group, error } = await supabaseClient
    .from('community_group')
    .select(`
      *,
      owner:profiles!community_group_owner_id_fkey ( display_name, avatar_url ),
      members:community_group_member!inner ( count ),
      posts:community_post ( count ),
      user_membership:community_group_member ( role, joined_at )
    `)
    .eq('slug', slug)
    .eq('is_deleted', false)
    .eq('members.is_deleted', false)
    .eq('user_membership.user_id', profile.id)
    .eq('user_membership.is_deleted', false)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Check access permissions
  const userMembership = group.user_membership[0] || null;
  
  if (group.visibility === 'private' && !userMembership) {
    return NextResponse.json({ 
      error: 'Access denied. This is a private group.',
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        slug: group.slug,
        visibility: group.visibility,
        member_count: group.members[0]?.count || 0,
        user_membership: null
      }
    }, { status: 403 });
  }

  // Process group data
  const processedGroup = {
    ...group,
    member_count: group.members[0]?.count || 0,
    post_count: group.posts[0]?.count || 0,
    user_membership: userMembership,
  };

  return NextResponse.json(processedGroup);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug } = await params;

  const { name, description, visibility } = await request.json();

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Check if user is owner or admin
  const { data: membership } = await supabaseClient
    .from('community_group_member')
    .select('role')
    .eq('group_id', (await supabaseClient
      .from('community_group')
      .select('id')
      .eq('slug', slug)
      .single()).data?.id)
    .eq('user_id', profile.id)
    .eq('is_deleted', false)
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Update group
  const { data: updatedGroup, error } = await supabaseClient
    .from('community_group')
    .update({ name, description, visibility })
    .eq('slug', slug)
    .eq('is_deleted', false)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updatedGroup);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug } = await params;

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Check if user is owner
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id, owner_id')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group || group.owner_id !== profile.id) {
    return NextResponse.json({ error: 'Only group owner can delete the group' }, { status: 403 });
  }

  // Soft delete group
  const { error } = await supabaseClient
    .from('community_group')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Group deleted successfully' });
}
