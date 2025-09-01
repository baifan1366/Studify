import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/server';

export async function GET() {
  const supabaseClient = await supabase();
  const { data: posts, error } = await supabaseClient
    .from('community_post')
    .select(`
      *,
      author:profiles ( display_name, avatar_url ),
      comments:community_comment ( count ),
      reactions:community_reaction ( emoji, user_id )
    `)
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
      commentsCount: post.comments[0]?.count || 0,
      reactions,
    };
  });

  return NextResponse.json(processedPosts);
}

export async function POST(request: Request) {
  const supabaseClient = await supabase();

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }
  
  // Get profile id from user_id
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: newPost, error } = await supabaseClient
    .from('community_post')
    .insert({ title, body, author_id: profile.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newPost);
}
