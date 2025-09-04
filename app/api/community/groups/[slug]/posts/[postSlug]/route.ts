import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(
  request: Request,
  { params }: { params: { slug: string; postSlug: string } }
) {
  console.log(`[API] GET /api/community/groups/${params.slug}/posts/${params.postSlug}`);
  
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    console.log('[API] Authorization failed.');
    return authResult;
  }
  console.log('[API] Authorization successful for user:', authResult.sub);

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = params;

  // 1. Get user profile
  console.log('[API] Fetching profile for user_id:', authResult.sub);
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    console.error('[API] Profile not found or error:', profileError);
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  console.log('[API] Profile found:', profile);

  // 2. Get group and check access
  console.log('[API] Fetching group with slug:', slug);
  const { data: group, error: groupError } = await supabaseClient
    .from('community_group')
    .select('id, visibility')
    .eq('slug', slug)
    .eq('is_deleted', false)
    .single();

  if (groupError || !group) {
    console.error('[API] Group not found or error:', groupError);
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }
  console.log('[API] Group found:', group);

  // 3. Check access for private groups
  if (group.visibility === 'private') {
    console.log('[API] Group is private. Checking membership...');
    const { data: membership, error: membershipError } = await supabaseClient
      .from('community_group_member')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .single();

    if (membershipError || !membership) {
      console.error('[API] Membership check failed or user is not a member:', membershipError);
      return NextResponse.json({ error: 'Access denied. Join the group to view this post.' }, { status: 403 });
    }
    console.log('[API] Membership confirmed.');
  }

  // 4. Get post
  console.log(`[API] Fetching post with group_id: ${group.id} and slug: ${postSlug}`);
  const { data: post, error: postError } = await supabaseClient
    .from('community_post')
    .select(`*,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility ),
      comments:community_comment ( *,
        author:profiles ( display_name, avatar_url )
      )
    `)
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (postError || !post) {
    console.error('[API] Post not found or error:', postError);
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  console.log('[API] Post found successfully.');

  // 5. Get reactions separately using polymorphic relationship
  const { data: postReactions } = await supabaseClient
    .from('community_reaction')
    .select('emoji, user_id')
    .eq('target_type', 'post')
    .eq('target_id', post.id);

  // Process reactions
  const reactions = (postReactions || []).reduce((acc: Record<string, number>, reaction: { emoji: string }) => {
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

// ... (PUT and DELETE functions remain the same)
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