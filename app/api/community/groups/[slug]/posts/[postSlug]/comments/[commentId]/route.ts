import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ slug: string; postSlug: string; commentId: string }> }
) {
  try {
    const authResult = await authorize(["student", "tutor"]);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabaseClient = await createServerClient();
    const { slug, postSlug, commentId } = await params;

    // 解析 FormData
    const formData = await request.formData();
    const body = formData.get("body") as string | null;

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // 获取 profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.sub)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 检查 group
    const { data: group } = await supabaseClient
      .from("community_group")
      .select("id")
      .eq("slug", slug)
      .eq("is_deleted", false)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // 检查 post
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

    // 检查 comment 是否存在 + 是否作者本人
    const { data: existingComment } = await supabaseClient
      .from("community_comment")
      .select("id, author_id, public_id")
      .eq("id", Number(commentId))
      .eq("post_id", post.id)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.author_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // 更新 comment body
    let updateData: any = {};
    if (body !== null) {
      if (body.trim().length === 0) {
        return NextResponse.json(
          { error: "Comment body cannot be empty" },
          { status: 400 }
        );
      }
      updateData.body = body.trim();
    }

    const { data: updatedComment, error: updateError } = await supabaseClient
      .from("community_comment")
      .update(updateData)
      .eq("id", existingComment.id)
      .select(
        `
        * ,
        author:profiles ( display_name, avatar_url )
      `
      )
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedComment, { status: 200 });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ slug: string; postSlug: string; commentId: string }> }
) {
  const authResult = await authorize(["student", "tutor"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug, commentId } = await params;

  // Get user profile
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get group
  const { data: group } = await supabaseClient
    .from("community_group")
    .select("id")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
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

  // Get comment and check ownership
  const { data: comment } = await supabaseClient
    .from("community_comment")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("post_id", post.id)
    .eq("is_deleted", false)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Check if user can delete (author or group admin/owner)
  const canDelete = comment.author_id === profile.id;

  if (!canDelete) {
    // Check if user is group admin/owner
    const { data: membership } = await supabaseClient
      .from("community_group_member")
      .select("role")
      .eq("group_id", group.id)
      .eq("user_id", profile.id)
      .eq("is_deleted", false)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
  }

  // Soft delete comment
  const { error } = await supabaseClient
    .from("community_comment")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Comment deleted successfully" });
}
