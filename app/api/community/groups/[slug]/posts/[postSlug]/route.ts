import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { randomUUID } from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  const authResult = await authorize("student");
  if (authResult instanceof NextResponse) {
    console.log("[API] Authorization failed.");
    return authResult;
  }
  console.log("[API] Authorization successful for user:", authResult.sub);

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;

  // 1. Get user profile
  console.log("[API] Fetching profile for user_id:", authResult.sub);
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (profileError || !profile) {
    console.error("[API] Profile not found or error:", profileError);
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // 2. Get group
  const { data: group, error: groupError } = await supabaseClient
    .from("community_group")
    .select("id, visibility")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // 3. Check private group access
  if (group.visibility === "private") {
    const { data: membership } = await supabaseClient
      .from("community_group_member")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", profile.id)
      .eq("is_deleted", false)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. Join the group to view this post." },
        { status: 403 }
      );
    }
  }

  // 4. Get post (注意这里取 public_id)
  const { data: post, error: postError } = await supabaseClient
    .from("community_post")
    .select(
      `
      id,
      public_id,
      title,
      body,
      slug,
      created_at,
      updated_at,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility ),
      comments:community_comment ( *,
        author:profiles ( display_name, avatar_url )
      )
    `
    )
    .eq("group_id", group.id)
    .eq("slug", postSlug)
    .eq("is_deleted", false)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // 5. Get reactions
  const { data: postReactions } = await supabaseClient
    .from("community_reaction")
    .select("emoji, user_id")
    .eq("target_type", "post")
    .eq("target_id", post.id);

  const reactions = (postReactions || []).reduce(
    (acc: Record<string, number>, reaction: { emoji: string }) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    },
    {}
  );

  // 6. Get attachments (based on post.public_id)
  const { data: attachments, error: attachmentError } = await supabaseClient
    .from("community_post_files")
    .select("id, url, file_name, mime_type")
    .eq("post_id", post.public_id);

  if (attachmentError) {
    console.error("[API] Failed to fetch attachments:", attachmentError);
  }

  // 7. Get hashtags
  const { data: hashtags, error: hashtagsError } = await supabaseClient
    .from("post_hashtags")
    .select("hashtag:hashtags(name)")
    .eq("post_id", post.public_id);

  if (hashtagsError) {
    console.error("[API] Failed to fetch hashtags:", hashtagsError);
  }

  // ✅ 最后再组装返回对象
  const processedPost = {
    ...post,
    comments_count: post.comments.length,
    reactions,
    files: attachments || [],
    hashtags: (hashtags || []).map((h: any) => ({
      name: h.hashtag?.name || "",
    })),
  };

  return NextResponse.json(processedPost);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  const authResult = await authorize("student");
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;

  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
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

  // Get post and check ownership/permissions
  const { data: post } = await supabaseClient
    .from("community_post")
    .select("id, author_id")
    .eq("group_id", group.id)
    .eq("slug", postSlug)
    .eq("is_deleted", false)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check if user can edit (author or group admin/owner)
  const canEdit = post.author_id === profile.id;

  if (!canEdit) {
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

  // Update post
  const { data: updatedPost, error } = await supabaseClient
    .from("community_post")
    .update({ title, body })
    .eq("id", post.id)
    .select(
      `
      *,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility )
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updatedPost);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  const authResult = await authorize("student");
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;
  const formData = await request.formData();

  const title = formData.get("title") as string | null;
  const body = formData.get("body") as string | null;
  const files = formData.getAll("files") as File[];
  const removeFileIds = formData.getAll("removeFileIds") as string[];

  // ===== 获取用户 profile =====
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // ===== 获取 group =====
  const { data: group } = await supabaseClient
    .from("community_group")
    .select("id")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // ===== 获取 post =====
  const { data: post } = await supabaseClient
    .from("community_post")
    .select("id, author_id, public_id")
    .eq("group_id", group.id)
    .eq("slug", postSlug)
    .eq("is_deleted", false)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // ===== 权限检查 =====
  const canEdit = post.author_id === profile.id;
  if (!canEdit) {
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

  // ===== 执行部分更新 =====
  const updates: { title?: string; body?: string } = {};
  if (title !== null) updates.title = title;
  if (body !== null) updates.body = body;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseClient
      .from("community_post")
      .update(updates)
      .eq("id", post.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update post: ${updateError.message}` },
        { status: 500 }
      );
    }
  }

  const BUCKET_NAME = "post-attachments";

  // ===== 删除文件 =====
  if (removeFileIds.length > 0) {
    const { data: filesToDelete, error: selectError } = await supabaseClient
      .from("community_post_files")
      .select("url")
      .in("id", removeFileIds);

    if (selectError) {
      console.error("Error selecting files to delete:", selectError);
    } else {
      const filePaths = filesToDelete.map((f) => {
        // Extract path from URL: https://<...>/storage/v1/object/public/post-attachments/<path>
        return f.url.substring(f.url.indexOf(BUCKET_NAME) + BUCKET_NAME.length + 1);
      });

      if (filePaths.length > 0) {
        const { error: storageError } = await supabaseClient.storage
          .from(BUCKET_NAME)
          .remove(filePaths);
        if (storageError) {
          console.error("Error deleting files from storage:", storageError);
        }
      }

      const { error: dbError } = await supabaseClient
        .from("community_post_files")
        .delete()
        .in("id", removeFileIds);
      if (dbError) {
        console.error("Error deleting file records from db:", dbError);
      }
    }
  }

  // ===== 上传新文件 =====
  if (files.length > 0) {
    const fileRecords = [];
    for (const file of files) {
      const filePath = `public/${slug}/${post.public_id}/${randomUUID()}-${file.name}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        continue;
      }

      const { data: publicUrlData } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      fileRecords.push({
        post_id: post.public_id,
        url: publicUrlData.publicUrl,
        file_name: file.name,
        mime_type: file.type,
      });
    }

    if (fileRecords.length > 0) {
      const { error: filesError } = await supabaseClient
        .from("community_post_files")
        .insert(fileRecords);
      if (filesError) {
        console.error("Error inserting new file records:", filesError);
      }
    }
  }

  // ===== 返回更新后的 post =====
  const { data: updatedPost, error } = await supabaseClient
    .from("community_post")
    .select(
      `
      *,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility )
    `
    )
    .eq("id", post.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updatedPost);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  const authResult = await authorize("student");
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (profileError || !profile) {
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

  // Get post and check ownership/permissions
  const { data: post } = await supabaseClient
    .from("community_post")
    .select("id, author_id")
    .eq("group_id", group.id)
    .eq("slug", postSlug)
    .eq("is_deleted", false)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check if user can delete (author or group admin/owner)
  const canDelete = post.author_id === profile.id;

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

  // Soft delete post
  const { error } = await supabaseClient
    .from("community_post")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", post.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Post deleted successfully" });
}
