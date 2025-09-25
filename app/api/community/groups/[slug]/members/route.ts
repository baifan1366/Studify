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

  // Check if user has access to view members
  const { data: userMembership } = await supabaseClient
    .from('community_group_member')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', profile.id)
    .eq('is_deleted', false)
    .single();

  if (group.visibility === 'private' && !userMembership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get members
  const { data: members, error } = await supabaseClient
    .from('community_group_member')
    .select(`
      *,
      user:profiles ( display_name, avatar_url )
    `)
    .eq('group_id', group.id)
    .eq('is_deleted', false)
    .order('joined_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(members);
}

export async function POST(
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

  // Get group
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id, visibility')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Check if user is already a member
  const { data: existingMembership } = await supabaseClient
    .from('community_group_member')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', profile.id)
    .eq('is_deleted', false)
    .single();

  if (existingMembership) {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  }

  // Join group
  const { data: newMembership, error } = await supabaseClient
    .from('community_group_member')
    .insert({
      group_id: group.id,
      user_id: profile.id,
      role: 'member'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newMembership);
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

  // Prevent owner from leaving
  if (group.owner_id === profile.id) {
    return NextResponse.json({ error: 'Group owner cannot leave the group' }, { status: 400 });
  }

  // Leave group (soft delete membership)
  const { error } = await supabaseClient
    .from('community_group_member')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('group_id', group.id)
    .eq('user_id', profile.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Left group successfully' });
}
