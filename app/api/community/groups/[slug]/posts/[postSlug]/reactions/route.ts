import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import redis from "@/utils/redis/redis";
import { getQStashQueue } from "@/lib/langChain/qstash-integration";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  const authResult = await authorize("student");
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;
  const { emoji, target_type, target_id } = await request.json();

  if (!emoji || !target_type || !target_id) {
    return NextResponse.json(
      { error: "Emoji, target_type, and target_id are required" },
      { status: 400 }
    );
  }

  if (!["post", "comment"].includes(target_type)) {
    return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
  }

  // 将 target_id 转成 number
  const targetId = Number(target_id);
  if (isNaN(targetId)) {
    return NextResponse.json({ error: "Invalid target_id" }, { status: 400 });
  }

  // Get user profile
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const profileId = profile.id;

  // Get group and check access
  const { data: group } = await supabaseClient
    .from("community_group")
    .select("id, visibility")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Check access for private groups
  if (group.visibility === "private") {
    const { data: membership } = await supabaseClient
      .from("community_group_member")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", profileId)
      .eq("is_deleted", false)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Get post
  const { data: post } = await supabaseClient
    .from("community_post")
    .select("id")
    .eq("group_id", group.id)
    .eq("slug", postSlug)
    .eq("is_deleted", false)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Verify target exists
  if (target_type === "post" && targetId !== post.id) {
    return NextResponse.json({ error: "Invalid post target" }, { status: 400 });
  }

  if (target_type === "comment") {
    const { data: comment } = await supabaseClient
      .from("community_comment")
      .select("id")
      .eq("id", targetId)
      .eq("post_id", post.id)
      .eq("is_deleted", false)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
  }

  // Check if reaction already exists
  const { data: existingReaction } = await supabaseClient
    .from("community_reaction")
    .select("id")
    .eq("user_id", profileId)
    .eq("target_type", target_type)
    .eq("target_id", targetId)
    .eq("emoji", emoji)
    .single();

  if (existingReaction) {
    // Remove existing reaction (toggle off) delete in redis
    await redis.hdel(`post:${targetId}:reactions`, profileId.toString());

    //send to qstash
    await getQStashQueue().queueEmbedding("reaction", targetId, 5);
    await getQStashQueue().queueReaction(
      "removed",
      profileId,
      target_type,
      targetId,
      emoji
    );

    return NextResponse.json({
      message: "Reaction removed (cached)",
      action: "removed",
    });
  } else {
    // Add new reaction
    await redis.hset(`post:${targetId}:reactions`, {
      [profileId]: emoji,
    });

    //send to qstash
    await getQStashQueue().queueEmbedding("reaction", targetId, 5);
    await getQStashQueue().queueReaction(
      "added",
      profileId,
      target_type,
      targetId,
      emoji
    );

    return NextResponse.json({
      message: "Reaction added (cached)",
      action: "added",
    });
  }
}
