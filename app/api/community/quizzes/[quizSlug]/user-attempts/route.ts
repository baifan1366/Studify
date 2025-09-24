import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取quiz信息
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, max_attempts, visibility, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 检查是否是作者
    const isAuthor = quiz.author_id === userId;

    // 检查用户是否有权限（对于private quiz）
    let hasPermission = true;
    if (quiz.visibility === 'private' && !isAuthor) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId);
      const order: Record<'view'|'attempt'|'edit', number> = { view: 1, attempt: 2, edit: 3 };
      let best: 'view'|'attempt'|'edit'|null = null;
      if (perms && perms.length > 0) {
        for (const p of perms) {
          const t = p.permission_type as 'view'|'attempt'|'edit';
          if (!best || order[t] > order[best]) best = t;
        }
      }
      hasPermission = !!best && (best === 'attempt' || best === 'edit');
    }

    // 获取用户的尝试次数 (包括所有状态用于分析)
    const { data: allAttempts, error: attemptsErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, status")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId);

    if (attemptsErr) {
      return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
    }

    // 分类统计尝试次数
    const allAttemptsCount = allAttempts?.length || 0;
    const completedAttempts = allAttempts?.filter(a => a.status === 'submitted' || a.status === 'graded') || [];
    const inProgressAttempts = allAttempts?.filter(a => a.status === 'in_progress') || [];
    const attemptCount = completedAttempts.length; // 用于限制检查的是已完成的尝试
    
    // 检查用户权限等级
    let userPermission: 'view'|'attempt'|'edit'|null = null;
    if (!isAuthor && quiz.visibility === 'private') {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId);
      const order: Record<'view'|'attempt'|'edit', number> = { view: 1, attempt: 2, edit: 3 };
      if (perms && perms.length > 0) {
        for (const p of perms) {
          const t = p.permission_type as 'view'|'attempt'|'edit';
          if (!userPermission || order[t] > order[userPermission]) userPermission = t;
        }
      }
    }

    // 确定用户是否可以尝试quiz
    let canAttempt = false;
    let accessReason = "";

    if (isAuthor) {
      canAttempt = true;
      accessReason = "author";
    } else if (quiz.visibility === 'public') {
      canAttempt = attemptCount < quiz.max_attempts;
      accessReason = canAttempt ? "public" : "max_attempts_reached";
    } else if (quiz.visibility === 'private') {
      if (userPermission === 'attempt' || userPermission === 'edit') {
        canAttempt = attemptCount < quiz.max_attempts;
        accessReason = canAttempt ? "granted_permission" : "max_attempts_reached";
      } else if (userPermission === 'view') {
        canAttempt = false;
        accessReason = "view_only_permission";
      } else {
        canAttempt = false;
        accessReason = "no_permission";
      }
    }

    return NextResponse.json({
      attemptCount, // 已完成的尝试次数
      allAttemptsCount, // 所有尝试次数
      inProgressCount: inProgressAttempts.length, // 进行中的尝试数
      maxAttempts: quiz.max_attempts,
      canAttempt,
      accessReason,
      isAuthor,
      userPermission,
      hasInProgressAttempt: inProgressAttempts.length > 0,
      quiz: {
        max_attempts: quiz.max_attempts,
        visibility: quiz.visibility,
      },
    });
  } catch (err: any) {
    console.error("Get user attempt status error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
