import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(request: Request) {
  const supabaseClient = await createServerClient();

  const authResult = await authorize(["student", "tutor"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const sortBy = url.searchParams.get("sort");

  try {
    // First, get user's group memberships
    const { data: memberships } = await supabaseClient
      .from("community_group_member")
      .select("group_id")
      .eq("user_id", profile.id)
      .eq("is_deleted", false);

    const memberGroupIds = memberships?.map((m) => m.group_id) || [];

    // Get all posts with basic info
    const { data: posts, error } = await supabaseClient
      .from("community_post")
      .select(
        `
        id,
        public_id,
        group_id,
        author_id,
        title,
        body,
        slug,
        is_deleted,
        created_at,
        updated_at,
        deleted_at,
        author:profiles!community_post_author_id_fkey ( display_name, avatar_url ),
        group:community_group ( name, slug, visibility )
      `
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter posts based on group visibility and membership
    const accessiblePosts =
      posts?.filter((post) => {
        // Posts without group (general posts) are always accessible
        if (!post.group_id || !post.group) return true;

        // Handle case where group might be an array (shouldn't happen with single relation)
        const group = Array.isArray(post.group) ? post.group[0] : post.group;
        if (!group) return true;

        // Public group posts are accessible to everyone
        if (group.visibility === "public") return true;

        // Private group posts are only accessible to members
        if (group.visibility === "private") {
          return memberGroupIds.includes(post.group_id);
        }

        return false;
      }) || [];

    // Get reaction counts for accessible posts
    const postIds = accessiblePosts.map((p) => p.id);
    const { data: reactions } = await supabaseClient
      .from("community_reaction")
      .select("post_id, emoji")
      .in("post_id", postIds);

    // Get comment counts for accessible posts
    const { data: commentCounts } = await supabaseClient
      .from("community_comment")
      .select("post_id")
      .in("post_id", postIds)
      .eq("is_deleted", false);

    // Get post files for accessible posts
    const postPublicIds = accessiblePosts.map((p) => p.public_id);
    const { data: postFiles } = await supabaseClient
      .from("community_post_files")
      .select("id, post_id, url, file_name, mime_type")
      .in("post_id", postPublicIds);

    // Process posts to add reaction and comment counts
    const processedPosts = accessiblePosts.map((post) => {
      // Aggregate reactions
      const postReactions =
        reactions?.filter((r) => r.post_id === post.id) || [];
      const reactionCounts = postReactions.reduce(
        (acc: Record<string, number>, reaction) => {
          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
          return acc;
        },
        {}
      );

      // Count comments
      const commentsCount =
        commentCounts?.filter((c) => c.post_id === post.id).length || 0;

      // Get files for this post
      const files = postFiles?.filter((f) => f.post_id === post.public_id) || [];

      return {
        ...post,
        reactions: reactionCounts,
        comments_count: commentsCount,
        files: files,
      };
    });

    // Sort posts if requested
    let sortedPosts = processedPosts;
    if (sortBy === "popular") {
      sortedPosts = processedPosts.sort((a, b) => {
        const aScore =
          (a.comments_count || 0) +
          Object.values(a.reactions || {}).reduce(
            (sum, count) => sum + count,
            0
          );
        const bScore =
          (b.comments_count || 0) +
          Object.values(b.reactions || {}).reduce(
            (sum, count) => sum + count,
            0
          );
        return bScore - aScore;
      });
    }

    return NextResponse.json(sortedPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabaseClient = await createServerClient();

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
  }

  // Get profile id from user_id
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: newPost, error } = await supabaseClient
    .from("community_post")
    .insert({ title, body, author_id: profile.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newPost);
}
