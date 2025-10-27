import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { randomUUID } from "crypto";
import { validateFiles } from "@/utils/file-validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authorize(["student", "tutor"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug } = await params;    

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("user_id", authResult.sub)
    .single();

  if (profileError || !profile) {
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
      return NextResponse.json(
        { error: "Access denied. Join the group to view posts." },
        { status: 403 }
      );
    }
  }

  // Get posts for this group
  const { data: posts, error } = await supabaseClient
    .from("community_post")
    .select(
      `
      *,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility ),
      comments:community_comment ( count ),
      post_hashtags(hashtags(id, name))
    `
    )
    .eq("group_id", group.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json([]);
  }

  // Batch fetch reactions and files
  const postIds = posts.map((post) => post.id);
  const postPublicIds = posts.map((post) => post.public_id);

  const [reactionsResponse, filesResponse] = await Promise.all([
    supabaseClient
      .from("community_reaction")
      .select("emoji, target_id")
      .eq("target_type", "post")
      .in("target_id", postIds),
    supabaseClient
      .from("community_post_files")
      .select("*")
      .in("post_id", postPublicIds),
  ]);

  // Group reactions and files by their respective post IDs
  const reactionsByPost = (reactionsResponse.data || []).reduce(
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

  const filesByPost = (filesResponse.data || []).reduce(
    (acc: Record<string, any[]>, file) => {
      if (!acc[file.post_id]) {
        acc[file.post_id] = [];
      }
      acc[file.post_id].push(file);
      return acc;
    },
    {}
  );

  // Process posts to aggregate reactions, comments count, and files
  const processedPosts = posts.map((post: any) => {
    const hashtags = post.post_hashtags
      .map((ph: any) => ph.hashtags)
      .filter(Boolean);
    return {
      ...post,
      comments_count: post.comments[0]?.count || 0,
      reactions: reactionsByPost[post.id] || {},
      files: filesByPost[post.public_id] || [],
      hashtags: hashtags,
    };
  });

  return NextResponse.json(processedPosts);
}

// Helper function to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

// Helper function to generate unique post slug within a group
async function generateUniquePostSlug(
  supabaseClient: any,
  groupId: number,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 0;
  const maxAttempts = 10;

  while (counter < maxAttempts) {
    const { data: existingPost } = await supabaseClient
      .from("community_post")
      .select("id")
      .eq("group_id", groupId)
      .eq("slug", slug)
      .eq("is_deleted", false)
      .single();

    if (!existingPost) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  throw new Error("Unable to generate unique post slug after maximum attempts");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authorize(["student", "tutor"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const supabaseClient = await createServerClient();
  const { slug: groupSlug } = await params;

  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const files = formData.getAll("files") as File[];
    const hashtags = formData.getAll("hashtags") as string[];

    // ===== 基本字段验证 =====
    if (!title || title.length < 5 || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be between 5-200 characters" },
        { status: 400 }
      );
    }

    if (!body || body.trim().length === 0) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    // ===== 文件大小验证（后端）=====
    if (files.length > 0) {
      const fileCheck = validateFiles(files, {
        maxVideoSizeMB: 30,
        maxOtherSizeMB: 10,
      });

      if (!fileCheck.valid) {
        return NextResponse.json({ error: fileCheck.error }, { status: 400 });
      }
    }

    // ===== 获取用户 profile =====
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // ===== 获取 group =====
    const { data: group } = await supabaseClient
      .from("community_group")
      .select("id, visibility, name")
      .eq("slug", groupSlug)
      .eq("is_deleted", false)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // ===== 权限检查 =====
    const { data: membership } = await supabaseClient
      .from("community_group_member")
      .select("id, role")
      .eq("group_id", group.id)
      .eq("user_id", profile.id)
      .eq("is_deleted", false)
      .single();

    // For private groups, membership is required
    if (group.visibility === "private" && !membership) {
      return NextResponse.json(
        { error: "You must be a member to post in this private group" },
        { status: 403 }
      );
    }

    // For public groups, user must still be a member to post
    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member to post in this group" },
        { status: 403 }
      );
    }

    // ===== 发帖频率限制 =====
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentPosts } = await supabaseClient
      .from("community_post")
      .select("id")
      .eq("author_id", profile.id)
      .gte("created_at", fiveMinutesAgo);

    if (recentPosts && recentPosts.length >= 3) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before posting again." },
        { status: 429 }
      );
    }

    // ===== 创建唯一 slug =====
    const baseSlug = slugify(title);
    if (!baseSlug) {
      return NextResponse.json(
        { error: "Invalid title for slug generation" },
        { status: 400 }
      );
    }
    const uniqueSlug = await generateUniquePostSlug(
      supabaseClient,
      group.id,
      baseSlug
    );

    // ===== 创建帖子 =====
    const { data: newPost, error: postError } = await supabaseClient
      .from("community_post")
      .insert({
        title,
        body,
        slug: uniqueSlug,
        group_id: group.id,
        author_id: profile.id,
      })
      .select(
        "*, author:profiles ( display_name, avatar_url ), group:community_group ( name, slug, visibility )"
      )
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    // ===== 处理 hashtags =====
    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        const cleanTag = tag.trim();
        if (!cleanTag) continue;

        const { data: existing } = await supabaseClient
          .from("hashtags")
          .select("id")
          .ilike("name", cleanTag)
          .single();

        let hashtagId;
        if (existing) {
          hashtagId = existing.id;
        } else {
          const { data: newHashtag } = await supabaseClient
            .from("hashtags")
            .insert([{ name: cleanTag }])
            .select("id")
            .single();
          hashtagId = newHashtag?.id;
        }

        if (hashtagId) {
          await supabaseClient
            .from("post_hashtags")
            .insert([{ post_id: newPost.public_id, hashtag_id: hashtagId }]);
        }
      }
    }

    // ===== 上传文件 =====
    if (files.length > 0) {
      const BUCKET_NAME = "post-attachments";
      const fileRecords = [];

      for (const file of files) {
        const filePath = `public/${groupSlug}/${
          newPost.public_id
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
          post_id: newPost.public_id,
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
          console.error("Error inserting file records:", filesError);
        }
      }
    }

    // ===== 增加积分 =====
    await supabaseClient.from("community_points_ledger").insert({
      user_id: profile.id,
      points: 10,
      reason: "Created community post",
      ref: JSON.stringify({
        post_id: newPost.id,
        group_id: group.id,
        action: "create_post",
      }),
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    if (error instanceof Error && error.message.includes("unique post slug")) {
      return NextResponse.json(
        { error: "Unable to generate unique post identifier" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
