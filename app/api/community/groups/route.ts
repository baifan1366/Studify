import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET() {
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  
  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get all groups with basic info
  const { data: allGroups, error: groupsError } = await supabaseClient
    .from('community_group')
    .select(`
      *,
      owner:profiles!community_group_owner_id_fkey ( display_name, avatar_url )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  // Get user memberships for all groups
  const { data: userMemberships } = await supabaseClient
    .from('community_group_member')
    .select('group_id, role, joined_at')
    .eq('user_id', profile.id)
    .eq('is_deleted', false);

  // Get member counts for all groups
  const { data: memberCounts } = await supabaseClient
    .from('community_group_member')
    .select('group_id')
    .eq('is_deleted', false);

  // Get post counts for all groups
  const { data: postCounts } = await supabaseClient
    .from('community_post')
    .select('group_id')
    .eq('is_deleted', false);

  // Create count maps
  const memberCountMap = new Map();
  const postCountMap = new Map();
  
  memberCounts?.forEach(member => {
    const count = memberCountMap.get(member.group_id) || 0;
    memberCountMap.set(member.group_id, count + 1);
  });
  
  postCounts?.forEach(post => {
    const count = postCountMap.get(post.group_id) || 0;
    postCountMap.set(post.group_id, count + 1);
  });

  // Filter groups based on visibility and membership
  const groups = (allGroups || []).filter(group => {
    const userMembership = userMemberships?.find(m => m.group_id === group.id);
    // Show public groups OR private groups where user is a member
    return group.visibility === 'public' || (group.visibility === 'private' && userMembership);
  }).map(group => {
    const userMembership = userMemberships?.find(m => m.group_id === group.id);
    return {
      ...group,
      user_membership: userMembership ? [userMembership] : []
    };
  });

  // Process groups to format data
  const processedGroups = groups.map(group => ({
    ...group,
    member_count: memberCountMap.get(group.id) || 0,
    post_count: postCountMap.get(group.id) || 0,
    user_membership: group.user_membership[0] || null,
  }));

  return NextResponse.json(processedGroups);
}

// Helper function to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to generate unique slug
async function generateUniqueSlug(supabaseClient: any, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;
  const maxAttempts = 10;

  while (counter < maxAttempts) {
    const { data: existingGroup } = await supabaseClient
      .from('community_group')
      .select('id')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();

    if (!existingGroup) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  throw new Error('Unable to generate unique slug after maximum attempts');
}

export async function POST(request: Request) {
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  
  try {
    const { name, description, slug: providedSlug, visibility = 'public' } = await request.json();

    // Validation
    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Name must be between 2-80 characters' }, { status: 400 });
    }

    if (!['public', 'private'].includes(visibility)) {
      return NextResponse.json({ error: 'Visibility must be public or private' }, { status: 400 });
    }

    // Get profile id from user_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Generate slug
    const baseSlug = slugify(providedSlug || name);
    if (!baseSlug) {
      return NextResponse.json({ error: 'Invalid name for slug generation' }, { status: 400 });
    }

    const uniqueSlug = await generateUniqueSlug(supabaseClient, baseSlug);

    // Start transaction for group creation and membership
    const { data: newGroup, error: groupError } = await supabaseClient
      .from('community_group')
      .insert({
        name,
        description,
        slug: uniqueSlug,
        visibility,
        owner_id: profile.id
      })
      .select(`
        *,
        owner:profiles!community_group_owner_id_fkey ( display_name, avatar_url )
      `)
      .single();

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    // Add creator as owner member
    const { error: memberError } = await supabaseClient
      .from('community_group_member')
      .insert({
        group_id: newGroup.id,
        user_id: profile.id,
        role: 'owner'
      });

    if (memberError) {
      console.error('Failed to add creator as member:', memberError);
      // Don't fail the request, but log the error
    }

    // Add points for creating a group
    await supabaseClient
      .from('community_points_ledger')
      .insert({
        user_id: profile.id,
        points: 25,
        reason: 'Created community group',
        ref: JSON.stringify({ group_id: newGroup.id, action: 'create_group' })
      });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    if (error instanceof Error && error.message.includes('unique slug')) {
      return NextResponse.json({ error: 'Unable to generate unique group identifier' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
