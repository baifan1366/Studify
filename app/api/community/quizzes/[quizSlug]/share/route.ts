import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取quiz信息并验证作者权限
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id, title, visibility")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 只有作者可以分享quiz
    if (quiz.author_id !== userId) {
      return NextResponse.json(
        { error: "Only the quiz author can share this quiz" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      permission_type = 'attempt', 
      expires_in_days = null, 
      max_uses = null 
    } = body;

    // 验证permission_type
    if (!['view', 'attempt', 'edit'].includes(permission_type)) {
      return NextResponse.json(
        { error: "Invalid permission type" },
        { status: 400 }
      );
    }

    // 生成唯一token
    const token = crypto.randomBytes(32).toString('hex');

    // 计算过期时间
    let expires_at: Date | null = null;
    if (expires_in_days) {
      expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expires_in_days);
    }

    // 创建邀请token
    const { data: inviteToken, error: tokenErr } = await supabase
      .from("community_quiz_invite_token")
      .insert({
        token,
        quiz_id: quiz.id,
        permission_type,
        created_by: userId,
        expires_at,
        max_uses,
        current_uses: 0,
        is_active: true
      })
      .select("token, expires_at")
      .single();

    if (tokenErr) {
      return NextResponse.json({ error: tokenErr.message }, { status: 500 });
    }

    // 生成邀请链接
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/community/quizzes/invite/${token}`;

    return NextResponse.json({
      invite_link: inviteLink,
      token: inviteToken.token,
      expires_at: inviteToken.expires_at,
      permission_type,
      quiz_title: quiz.title
    });

  } catch (err: any) {
    console.error("Share quiz error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// 获取quiz的所有邀请链接
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取quiz信息并验证作者权限
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.author_id !== userId) {
      return NextResponse.json(
        { error: "Only the quiz author can view invite links" },
        { status: 403 }
      );
    }

    // 获取所有活跃的邀请token
    const { data: tokens, error: tokensErr } = await supabase
      .from("community_quiz_invite_token")
      .select("token, permission_type, expires_at, max_uses, current_uses, created_at")
      .eq("quiz_id", quiz.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (tokensErr) {
      return NextResponse.json({ error: tokensErr.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLinks = tokens?.map(token => ({
      ...token,
      invite_link: `${baseUrl}/community/quizzes/invite/${token.token}`
    })) || [];

    return NextResponse.json(inviteLinks);

  } catch (err: any) {
    console.error("Get invite links error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// 撤销（删除）某个邀请链接
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取quiz信息并验证作者权限
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.author_id !== userId) {
      return NextResponse.json(
        { error: "Only the quiz author can revoke invite links" },
        { status: 403 }
      );
    }

    // 支持从 query 参数或 body 传入 token
    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    if (!token) {
      try {
        const body = await req.json();
        token = body?.token;
      } catch {
        // ignore
      }
    }

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // 将该 token 标记为失效
    const { error: updErr } = await supabase
      .from("community_quiz_invite_token")
      .update({ is_active: false, expires_at: new Date().toISOString() })
      .eq("token", token)
      .eq("quiz_id", quiz.id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Revoke invite link error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
