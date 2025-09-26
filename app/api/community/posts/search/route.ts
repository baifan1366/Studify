// app/api/community/posts/search/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { Post } from "@/interface/community/post-interface";

export async function GET(
  req: Request
): Promise<NextResponse<Post[] | { error: string }>> {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";

  if (!query.trim()) {
    return NextResponse.json<Post[]>([]);
  }

  const supabase = await createServerClient();

  try {
    // 搜索帖子
    const { data: posts, error } = await supabase
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
        group:community_group ( id, name, slug, visibility )
      `
      )
      .textSearch("search_vector", query, { type: "websearch" })
      .eq("is_deleted", false)
      .limit(50)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 过滤 private group，确保只有可访问的帖子返回
    const accessiblePosts =
      posts?.filter((post) => {
        const group = Array.isArray(post.group) ? post.group[0] : post.group;
        if (!group) return true; // 无 group 的帖子公开
        return group.visibility === "public";
      }) || [];

    const postIds = accessiblePosts.map((p) => p.id);

    // 获取 reactions
    const { data: reactions } = await supabase
      .from("community_reaction")
      .select("post_id, emoji")
      .in("post_id", postIds);

    // 获取 comment counts
    const { data: commentCounts } = await supabase
      .from("community_comment")
      .select("post_id")
      .in("post_id", postIds)
      .eq("is_deleted", false);

    // 获取 post files
    const postPublicIds = accessiblePosts.map((p) => p.public_id);
    const { data: postFiles } = await supabase
      .from("community_post_files")
      .select("id, post_id, url, file_name, mime_type")
      .in("post_id", postPublicIds);

    // 获取 hashtags
    const { data: postHashtags } = await supabase
      .from("post_hashtags")
      .select("post_id, hashtags(id, name)")
      .in("post_id", postPublicIds);

    // 构建完整帖子对象
    const processedPosts: Post[] = accessiblePosts.map((post) => {
      const postReactions =
        reactions?.filter((r) => r.post_id === post.id) || [];
      const reactionCounts: Record<string, number> = postReactions.reduce(
        (acc, r) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const comments_count =
        commentCounts?.filter((c) => c.post_id === post.id).length || 0;

      // author 取第一个
      const authorObj = Array.isArray(post.author)
        ? post.author[0]
        : post.author;

      // group 也取第一个
      const groupObj = Array.isArray(post.group) ? post.group[0] : post.group;

      // 获取该帖子的文件
      const files = postFiles?.filter((f) => f.post_id === post.public_id) || [];

      // 获取该帖子的hashtags
      const hashtags = postHashtags?.filter((ph) => ph.post_id === post.public_id)
        .map((ph) => ph.hashtags)
        .filter(Boolean)
        .flat() || [];

      return {
        ...post,
        author: authorObj,
        group: groupObj, // ✅ 单个对象，匹配 interface
        reactions: reactionCounts,
        comments_count,
        files: files,
        hashtags: hashtags,
      };
    });

    return NextResponse.json<Post[]>(processedPosts);
  } catch (err) {
    console.error("Error searching posts:", err);
    return NextResponse.json<{ error: string }>(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
