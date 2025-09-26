import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // 验证用户权限
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createAdminClient();
    const { postId } = await params;

    // 获取当前用户的 profile.id（数值型）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.sub)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 查询帖子详情（先按 public_id，再按 id）
    const baseSelect = `
        id,
        public_id,
        slug,
        title,
        body,
        created_at,
        updated_at,
        author:profiles (
          id,
          display_name,
          avatar_url
        ),
        group:community_group (
          id,
          slug,
          name,
          avatar_url,
          visibility
        ),
        files:community_post_files (
          id,
          file_name,
          url,
          mime_type,
          file_size
        )
      `;

    let post: any = null;
    
    // 优先 public_id（大多数分享走 public_id）
    let res = await supabase.from('community_post').select(baseSelect).eq('public_id', postId).neq('is_deleted', true).maybeSingle();
    post = res.data;
    
    if (!post) {
      // 尝试按数字 id
      const isNumeric = /^\d+$/.test(postId);
      if (isNumeric) {
        res = await supabase.from('community_post').select(baseSelect).eq('id', parseInt(postId, 10)).neq('is_deleted', true).maybeSingle();
        post = res.data;
      }
    }

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 检查帖子可见性
    const group = Array.isArray(post.group) ? post.group[0] : post.group;
    if (group && group.visibility === "private") {
      // 检查用户是否是群组成员
      const { data: membership } = await supabase
        .from("community_group_member")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", profile.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ post });

  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
