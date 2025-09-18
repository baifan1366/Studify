import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const supabase = await createClient();

    // 获取邀请token信息
    const { data: inviteToken, error: tokenErr } = await supabase
      .from("community_quiz_invite_token")
      .select(`
        id,
        quiz_id,
        permission_type,
        expires_at,
        max_uses,
        current_uses,
        is_active,
        community_quiz!inner(
          slug,
          title,
          description,
          author_id
        )
      `)
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenErr || !inviteToken) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
    }

    // 检查是否过期
    if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
    }

    // 检查使用次数限制
    if (inviteToken.max_uses && inviteToken.current_uses >= inviteToken.max_uses) {
      return NextResponse.json({ error: "Invite link has reached maximum uses" }, { status: 410 });
    }

    // 返回邀请信息（不需要认证）
    const quiz = Array.isArray(inviteToken.community_quiz) 
      ? inviteToken.community_quiz[0] 
      : inviteToken.community_quiz;
      
    return NextResponse.json({
      quiz: {
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description
      },
      permission_type: inviteToken.permission_type,
      expires_at: inviteToken.expires_at
    });

  } catch (err: any) {
    console.error("Get invite info error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取邀请token信息
    const { data: inviteToken, error: tokenErr } = await supabase
      .from("community_quiz_invite_token")
      .select(`
        id,
        quiz_id,
        permission_type,
        expires_at,
        max_uses,
        current_uses,
        is_active,
        created_by,
        community_quiz!inner(
          slug,
          title,
          author_id
        )
      `)
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenErr || !inviteToken) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
    }

    // 检查是否过期
    if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
    }

    // 检查使用次数限制
    if (inviteToken.max_uses && inviteToken.current_uses >= inviteToken.max_uses) {
      return NextResponse.json({ error: "Invite link has reached maximum uses" }, { status: 410 });
    }

    // 检查用户是否已经有权限
    const { data: existingPermission } = await supabase
      .from("community_quiz_permission")
      .select("id")
      .eq("quiz_id", inviteToken.quiz_id)
      .eq("user_id", userId)
      .eq("permission_type", inviteToken.permission_type)
      .maybeSingle();

    if (existingPermission) {
      const quiz = Array.isArray(inviteToken.community_quiz) 
        ? inviteToken.community_quiz[0] 
        : inviteToken.community_quiz;
        
      return NextResponse.json({ 
        message: "You already have access to this quiz",
        quiz_slug: quiz.slug
      });
    }

    // 开始事务：授予权限并更新使用次数
    const { error: permissionErr } = await supabase
      .from("community_quiz_permission")
      .insert({
        quiz_id: inviteToken.quiz_id,
        user_id: userId,
        permission_type: inviteToken.permission_type,
        granted_by: inviteToken.created_by
      });

    if (permissionErr) {
      return NextResponse.json({ error: permissionErr.message }, { status: 500 });
    }

    // 更新使用次数
    const { error: updateErr } = await supabase
      .from("community_quiz_invite_token")
      .update({ current_uses: inviteToken.current_uses + 1 })
      .eq("id", inviteToken.id);

    if (updateErr) {
      console.warn("Failed to update token usage count:", updateErr);
    }

    const quiz = Array.isArray(inviteToken.community_quiz) 
      ? inviteToken.community_quiz[0] 
      : inviteToken.community_quiz;

    return NextResponse.json({
      message: "Successfully granted access to quiz",
      quiz_slug: quiz.slug,
      permission_type: inviteToken.permission_type
    });

  } catch (err: any) {
    console.error("Accept invite error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
