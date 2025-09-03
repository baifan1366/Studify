import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug } = params;

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
      return NextResponse.json({ error: 'Access denied. Join the group to view posts.' }, { status: 403 });
    }
  }

  // Get posts for this group
  const { data: posts, error } = await supabaseClient
    .from('community_post')
    .select(`
      *,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility ),
      comments:community_comment ( count ),
      reactions:community_reaction ( emoji, user_id )
    `)
    .eq('group_id', group.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Process posts to aggregate reactions and comments count
  const processedPosts = posts.map(post => {
    const reactions = post.reactions.reduce((acc: Record<string, number>, reaction: { emoji: string }) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {});
    return {
      ...post,
      comments_count: post.comments[0]?.count || 0,
      reactions,
    };
  });

  return NextResponse.json(processedPosts);
}

// Helper function to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

// Helper function to generate unique post slug within a group
async function generateUniquePostSlug(supabaseClient: any, groupId: number, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;
  const maxAttempts = 10;

  while (counter < maxAttempts) {
    const { data: existingPost } = await supabaseClient
      .from('community_post')
      .select('id')
      .eq('group_id', groupId)
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();

    if (!existingPost) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  throw new Error('Unable to generate unique post slug after maximum attempts');
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug: groupSlug } = params;

  try {
    const { title, body, slug: providedSlug } = await request.json();

    // Validation
    if (!title || title.length < 5 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 5-200 characters' }, { status: 400 });
    }

    if (!body || body.trim().length === 0) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
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
      .select('id, visibility, name')
      .eq('slug', groupSlug)
      .eq('is_deleted', false)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check permissions - user must be a member for private groups, optional for public groups
    const { data: membership } = await supabaseClient
      .from('community_group_member')
      .select('id, role')
      .eq('group_id', group.id)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .single();

    if (group.visibility === 'private' && !membership) {
      return NextResponse.json({ error: 'You must be a member to post in this private group' }, { status: 403 });
    }

    // Rate limiting check - prevent spam (optional: implement based on your needs)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentPosts } = await supabaseClient
      .from('community_post')
      .select('id')
      .eq('author_id', profile.id)
      .gte('created_at', fiveMinutesAgo);

    if (recentPosts && recentPosts.length >= 3) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before posting again.' }, { status: 429 });
    }

    // Generate unique slug
    const baseSlug = slugify(providedSlug || title);
    if (!baseSlug) {
      return NextResponse.json({ error: 'Invalid title for slug generation' }, { status: 400 });
    }

    const uniqueSlug = await generateUniquePostSlug(supabaseClient, group.id, baseSlug);

    // Create post
    const { data: newPost, error: postError } = await supabaseClient
      .from('community_post')
      .insert({
        title,
        body,
        slug: uniqueSlug,
        group_id: group.id,
        author_id: profile.id
      })
      .select(`
        *,
        author:profiles ( display_name, avatar_url ),
        group:community_group ( name, slug, visibility )
      `)
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    // Add points for creating a post
    await supabaseClient
      .from('community_points_ledger')
      .insert({
        user_id: profile.id,
        points: 10,
        reason: 'Created community post',
        ref: JSON.stringify({ post_id: newPost.id, group_id: group.id, action: 'create_post' })
      });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    if (error instanceof Error && error.message.includes('unique post slug')) {
      return NextResponse.json({ error: 'Unable to generate unique post identifier' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
