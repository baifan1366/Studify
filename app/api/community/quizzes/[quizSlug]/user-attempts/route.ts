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
      .select("id, max_attempts, visibility, quiz_mode, author_id")
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
      const { data: permission } = await supabase
        .from("community_quiz_permission")
        .select("id")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .in("permission_type", ["attempt", "edit"])
        .maybeSingle();
      
      hasPermission = !!permission;
    }

    // 获取用户的尝试次数
    const { data: attempts, error: attemptsErr } = await supabase
      .from("community_quiz_attempt")
      .select("id")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId);

    if (attemptsErr) {
      return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
    }

    const attemptCount = attempts?.length || 0;
    
    // 检查用户权限等级
    let userPermission = null;
    if (!isAuthor && quiz.visibility === 'private') {
      const { data: permission } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .maybeSingle();
      
      userPermission = permission?.permission_type || null;
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
      attemptCount,
      maxAttempts: quiz.max_attempts,
      canAttempt,
      accessReason,
      isAuthor,
      userPermission,
      quiz: {
        max_attempts: quiz.max_attempts,
        visibility: quiz.visibility,
        quiz_mode: quiz.quiz_mode,
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
