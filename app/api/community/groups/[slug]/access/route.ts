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

  try {
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
    const { data: groupData, error: groupError } = await supabaseClient
      .from('community_group')
      .select(`
        id,
        public_id,
        name,
        description,
        slug,
        visibility,
        owner_id,
        is_deleted,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq('slug', (await params).slug)
      .eq('is_deleted', false)
      .single();

    if (groupError || !groupData) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    let canPost = true;
    let userMembership = null;

    // Check if user can post (must be member for private groups)
    if (groupData.visibility === 'private') {
      const { data: membership, error: membershipError } = await supabaseClient
        .from('community_group_member')
        .select('id, role, joined_at')
        .eq('group_id', groupData.id)
        .eq('user_id', profile.id)
        .eq('is_deleted', false)
        .single();

      if (membershipError || !membership) {
        canPost = false;
      } else {
        userMembership = {
          role: membership.role,
          joined_at: membership.joined_at
        };
      }
    }

    // Get member count
    const { count: memberCount } = await supabaseClient
      .from('community_group_member')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupData.id)
      .eq('is_deleted', false);

    // Get post count
    const { count: postCount } = await supabaseClient
      .from('community_post')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupData.id)
      .eq('is_deleted', false);

    // Build the complete group object with extended properties
    const group = {
      ...groupData,
      member_count: memberCount || 0,
      post_count: postCount || 0,
      user_membership: userMembership
    };

    return NextResponse.json({
      group,
      canPost
    });

  } catch (error) {
    console.error('Error checking group access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
