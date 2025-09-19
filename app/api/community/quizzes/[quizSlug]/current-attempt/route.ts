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
      .select("id, visibility, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 检查是否是作者
    const isAuthor = quiz.author_id === userId;

    // 检查private quiz的访问权限
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

      if (!best || (best !== 'attempt' && best !== 'edit')) {
        return NextResponse.json(
          { error: "You don't have permission to access this private quiz" },
          { status: 403 }
        );
      }
    }

    // 查找用户当前的进行中attempt
    const { data: currentAttempt, error: attemptErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, status, created_at, score")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (attemptErr) {
      return NextResponse.json({ error: attemptErr.message }, { status: 500 });
    }

    if (!currentAttempt) {
      return NextResponse.json({ 
        hasCurrentAttempt: false,
        currentAttempt: null 
      }, { status: 200 });
    }

    // 获取当前attempt的答案进度
    const { data: answers, error: answersErr } = await supabase
      .from("community_quiz_attempt_answer")
      .select("question_id, is_correct")
      .eq("attempt_id", currentAttempt.id);

    if (answersErr) {
      return NextResponse.json({ error: answersErr.message }, { status: 500 });
    }

    // 获取quiz的总问题数
    const { count: totalQuestions } = await supabase
      .from("community_quiz_question")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);

    // 获取session信息（如果存在）
    const { data: session } = await supabase
      .from("community_quiz_attempt_session")
      .select("*")
      .eq("attempt_id", currentAttempt.id)
      .maybeSingle();

    const answeredQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;

    // 计算剩余时间（如果有session和时间限制）
    let remainingSeconds = null;
    let isExpired = false;
    const now = new Date();

    if (session && session.time_limit_minutes && session.started_at) {
      const startTime = new Date(session.started_at);
      const timeLimit = session.time_limit_minutes * 60;
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      remainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
      isExpired = remainingSeconds === 0;
    }

    return NextResponse.json({
      hasCurrentAttempt: true,
      currentAttempt: {
        id: currentAttempt.id,
        status: currentAttempt.status,
        created_at: currentAttempt.created_at,
        score: currentAttempt.score,
        progress: {
          answered: answeredQuestions,
          total: totalQuestions || 0,
          correct: correctAnswers,
          percentage: totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
          current_question_index: session?.current_question_index || 0
        }
      },
      session: session ? {
        public_id: session.public_id,
        id: session.id,
        session_token: session.session_token,
        status: session.status,
        time_limit_minutes: session.time_limit_minutes,
        time_spent_seconds: session.time_spent_seconds,
        current_question_index: session.current_question_index,
        remaining_seconds: remainingSeconds,
        is_expired: isExpired,
        started_at: session.started_at,
        last_activity_at: session.last_activity_at
      } : null
    }, { status: 200 });

  } catch (err: any) {
    console.error("Get current attempt error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
