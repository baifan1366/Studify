import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { randomUUID } from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  const authResult = await authorize(["student", "tutor"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug, postSlug } = await params;

  // Get user profile
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

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
      .eq("user_id", profile.id)
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

  // Get comments with author info
  const { data: comments, error } = await supabaseClient
    .from("community_comment")
    .select(
      `
      *,
      author:profiles ( display_name, avatar_url )
    `
    )
    .eq("post_id", post.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const commentIds = comments.map((c) => c.id);
  const commentPublicIds = comments.map((c) => c.public_id);

  // 批量获取 reactions 和 files
  const [reactionsResponse, filesResponse] = await Promise.all([
    supabaseClient
      .from("community_reaction")
      .select("emoji, target_id")
      .eq("target_type", "comment")
      .in("target_id", commentIds),
    supabaseClient
      .from("community_comment_files")
      .select("*")
      .in("comment_id", commentPublicIds),
  ]);

  // Group reactions by comment ID from database
  const reactionsByComment = (reactionsResponse.data || []).reduce(
    (acc: Record<number, Record<string, number>>, reaction) => {
      if (!acc[reaction.target_id]) {
        acc[reaction.target_id] = {};
      }
      acc[reaction.target_id][reaction.emoji] =
        (acc[reaction.target_id][reaction.emoji] || 0) + 1;
      return acc;
    },
    {}
  );

  // Get Redis reactions for real-time data
  try {
    const redis = (await import("@/utils/redis/redis")).default;
    
    // Get Redis reactions for all comments
    for (const commentId of commentIds) {
      const redisKey = `comment:${commentId}:reactions`;
      const redisReactions: Record<string, string> = await redis.hgetall(redisKey) || {};
      
      // Add Redis reactions to the comment
      Object.entries(redisReactions).forEach(([userId, emoji]) => {
        if (!reactionsByComment[commentId]) {
          reactionsByComment[commentId] = {};
        }
        if (typeof emoji === 'string') {
          reactionsByComment[commentId][emoji] = (reactionsByComment[commentId][emoji] || 0) + 1;
        }
      });
    }
  } catch (redisError) {
    console.warn("Failed to get Redis reactions for comments:", redisError);
  }

  // Group files
  const filesByComment = (filesResponse.data || []).reduce(
    (acc: Record<string, any[]>, file) => {
      if (!acc[file.comment_id]) {
        acc[file.comment_id] = [];
      }
      acc[file.comment_id].push(file);
      return acc;
    },
    {}
  );

  // Process reactions for each comment
  const processedComments = comments.map((comment) => ({
    ...comment,
    reactions: reactionsByComment[comment.id] || {},
    files: filesByComment[comment.public_id] || [],
  }));

  return NextResponse.json(processedComments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
  try {
    const authResult = await authorize(["student", "tutor"]);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabaseClient = await createServerClient();
    const { slug, postSlug } = await params;

    // 解析 FormData
    const formData = await request.formData();
    const body = formData.get("body") as string;
    const parent_id = formData.get("parent_id") as string | null;
    const files = formData.getAll("files") as File[];
    const sendNotification = formData.get("sendNotification") === "true";

    if (!body || body.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment body is required" },
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
      .select("id, visibility")
      .eq("slug", slug)
      .eq("is_deleted", false)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // 检查 membership - 只有 private group 需要检查成员资格
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
          { error: "You must be a group member to comment on private posts" },
          { status: 403 }
        );
      }
    }
    // public group 的 post 任何登录用户都可以评论

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

    // 检查 parent_id
    let parentIdNum = null;
    if (parent_id) {
      parentIdNum = Number(parent_id);
      const { data: parentComment } = await supabaseClient
        .from("community_comment")
        .select("id")
        .eq("id", parentIdNum)
        .eq("post_id", post.id)
        .eq("is_deleted", false)
        .single();

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    // 插入 comment
    const { data: newComment, error } = await supabaseClient
      .from("community_comment")
      .insert({
        post_id: post.id,
        author_id: profile.id,
        body: body.trim(),
        parent_id: parentIdNum,
      })
      .select(
        `
        *,
        author:profiles ( display_name, avatar_url )
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle file uploads
    if (files && files.length > 0) {
      const fileRecords = [];
      const BUCKET_NAME = "comment-attachments";

      //MIME type check
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          console.warn(`File skipped: ${file.name} is not an image`);
          //todo: return response error
          continue;
        }

        const filePath = `public/${slug}/${
          newComment.public_id
        }/${randomUUID()}-${file.name}`;
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
          comment_id: newComment.public_id,
          url: publicUrlData.publicUrl,
          file_name: file.name,
          mime_type: file.type,
        });
      }

      if (fileRecords.length > 0) {
        const { error: filesError } = await supabaseClient
          .from("community_comment_files")
          .insert(fileRecords);

        if (filesError) {
          console.error("Error inserting file records:", filesError);
        }
      }
    }

    // Send notification if requested
    if (sendNotification) {
      try {
        // Get post author
        const { data: postData } = await supabaseClient
          .from("community_post")
          .select("author_id, title")
          .eq("id", post.id)
          .single();

        if (postData && postData.author_id !== profile.id) {
          const { notificationService } = await import('@/lib/notifications/notification-service');
          
          await notificationService.createNotification({
            user_id: postData.author_id,
            kind: 'community_notification',
            payload: {
              type: 'new_comment',
              post_id: post.id,
              post_title: postData.title,
              comment_content: body.substring(0, 100),
              commenter_id: profile.id,
              commenter_name: newComment.author?.display_name || 'Someone',
            },
            title: '新评论',
            message: `${newComment.author?.display_name || 'Someone'} 评论了您的帖子`,
            deep_link: `/community/groups/${slug}/posts/${postSlug}`,
            send_push: true,
          });
        }

        // If replying to a comment, notify parent comment author
        if (parentIdNum) {
          const { data: parentComment } = await supabaseClient
            .from("community_comment")
            .select("author_id")
            .eq("id", parentIdNum)
            .single();

          if (parentComment && parentComment.author_id !== profile.id) {
            const { notificationService } = await import('@/lib/notifications/notification-service');
            
            await notificationService.createNotification({
              user_id: parentComment.author_id,
              kind: 'community_notification',
              payload: {
                type: 'comment_reply',
                post_id: post.id,
                reply_content: body.substring(0, 100),
                replier_id: profile.id,
                replier_name: newComment.author?.display_name || 'Someone',
              },
              title: '评论回复',
              message: `${newComment.author?.display_name || 'Someone'} 回复了您的评论`,
              deep_link: `/community/groups/${slug}/posts/${postSlug}`,
              send_push: true,
            });
          }
        }
      } catch (notifError) {
        console.error('Failed to send comment notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
