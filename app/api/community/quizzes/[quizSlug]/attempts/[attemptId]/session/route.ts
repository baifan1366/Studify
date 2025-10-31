import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

// GET - 获取当前 session 状态
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; attemptId: string }> }
) {
  try {
    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();
    const { quizSlug, attemptId } = await params;

    // 1. 验证 attempt 权限
    const { data: attempt, error: attemptErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, quiz_id, status")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    // 2. 获取 session
    const { data: session, error: sessionErr } = await supabase
      .from("community_quiz_attempt_session")
      .select("*")
      .eq("attempt_id", attempt.id)
      .maybeSingle();

    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 3. 计算服务器端剩余时间（基于服务器时间，确保公平性）
    const now = new Date();
    let remainingSeconds: number | null = null;
    let isExpired = false;

    if (session.time_limit_minutes && session.started_at) {
      const startTime = new Date(session.started_at);
      const timeLimit = session.time_limit_minutes * 60; // seconds
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      remainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
      isExpired = remainingSeconds === 0;
    }

    // 4. 如果已过期，自动标记为过期
    if (isExpired && session.status === "active") {
      await supabase
        .from("community_quiz_attempt_session")
        .update({
          status: "expired",
          updated_at: now.toISOString(),
        })
        .eq("id", session.id);

      await autoSubmitExpiredAttempt(supabase, attempt.id);

      return NextResponse.json({
        ...session,
        status: "expired",
        remaining_seconds: 0,
        is_expired: true,
        server_time: now.toISOString(),
      });
    }

    return NextResponse.json({
      ...session,
      remaining_seconds: remainingSeconds,
      is_expired: isExpired,
      server_time: now.toISOString(),
    });
  } catch (err: any) {
    console.error("Get session error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

// POST - 创建新的 session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; attemptId: string }> }
) {
  try {
    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();
    const { quizSlug, attemptId } = await params;

    // 1. 验证 attempt 权限
    const { data: attempt, error: attemptErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, quiz_id, status")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    // 2. 获取 quiz 的时间限制
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("time_limit_minutes")
      .eq("id", attempt.quiz_id)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 3. 获取题目总数
    const { count: totalQuestions } = await supabase
      .from("community_quiz_question")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", attempt.quiz_id);

    // 3.1. 验证题目数量
    if (!totalQuestions || totalQuestions === 0) {
      return NextResponse.json(
        { error: "Quiz has no questions" }, 
        { status: 400 }
      );
    }

    // 4. 检查是否已存在 session
    const { data: existingSession } = await supabase
      .from("community_quiz_attempt_session")
      .select("id")
      .eq("attempt_id", attempt.id)
      .maybeSingle();

    if (existingSession) {
      return NextResponse.json({ error: "Session already exists" }, { status: 409 });
    }

    // 5. 生成 session token 和计算过期时间
    const sessionToken = crypto.randomUUID();
    const now = new Date();
    let expiresAt: string | null = null;

    if (quiz.time_limit_minutes) {
      expiresAt = new Date(now.getTime() + quiz.time_limit_minutes * 60 * 1000).toISOString();
    }

    // 6. 获取客户端信息和初始题目索引
    const body = await req.json().catch(() => ({}));
    const browserInfo = body.browser_info || {};
    const clientIP =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // 检查是否有已提交的答案来确定起始题目索引
    const { count: answeredCount } = await supabase
      .from("community_quiz_attempt_answer")
      .select("*", { count: "exact", head: true })
      .eq("attempt_id", attempt.id);

    const initialQuestionIndex = Math.max(0, answeredCount || 0);

    // 7. 创建 session
    const { data: session, error: createErr } = await supabase
      .from("community_quiz_attempt_session")
      .insert({
        attempt_id: attempt.id,
        quiz_id: attempt.quiz_id,
        user_id: userId,
        session_token: sessionToken,
        status: "active",
        time_limit_minutes: quiz.time_limit_minutes,
        time_spent_seconds: 0,
        started_at: now.toISOString(),
        last_activity_at: now.toISOString(),
        expires_at: expiresAt,
        current_question_index: initialQuestionIndex,
        total_questions: totalQuestions || 0,
        browser_info: browserInfo,
        ip_address: clientIP,
      })
      .select("*")
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    // 8. 计算剩余时间
    let remainingSeconds: number | null = null;
    if (quiz.time_limit_minutes) {
      remainingSeconds = quiz.time_limit_minutes * 60;
    }

    return NextResponse.json(
      {
        ...session,
        remaining_seconds: remainingSeconds,
        is_expired: false,
        server_time: now.toISOString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Create session error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

// PUT - 更新 session（心跳/进度更新）
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; attemptId: string }> }
) {
  try {
    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();
    const { quizSlug, attemptId } = await params;
    const body = await req.json();

    // 1. 验证 attempt 权限
    const { data: attempt, error: attemptErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, quiz_id, status")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    // 2. 获取当前 session
    const { data: session, error: sessionErr } = await supabase
      .from("community_quiz_attempt_session")
      .select("*")
      .eq("attempt_id", attempt.id)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 3. 验证 session token（可选，增强安全性）
    if (body.session_token && body.session_token !== session.session_token) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 403 });
    }

    // 4. 检查 session 是否已过期
    const now = new Date();
    let isExpired = false;

    if (session.time_limit_minutes && session.started_at) {
      const startTime = new Date(session.started_at);
      const timeLimit = session.time_limit_minutes * 60;
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      isExpired = elapsedSeconds >= timeLimit;
    }

    if (isExpired && session.status === "active") {
      // 自动过期
      await supabase
        .from("community_quiz_attempt_session")
        .update({
          status: "expired",
          updated_at: now.toISOString(),
        })
        .eq("id", session.id);

      await autoSubmitExpiredAttempt(supabase, attempt.id);

      return NextResponse.json(
        {
          error: "Session has expired",
          remaining_seconds: 0,
          is_expired: true,
        },
        { status: 410 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    // 5. 服务器端计算用时：直接用 now - started_at
    const startedAt = new Date(session.started_at);
    const newTimeSpent = Math.max(
      0,
      Math.floor((now.getTime() - startedAt.getTime()) / 1000)
    );

    // 6. 准备更新数据（支持进度变更）
    const updates: any = {
      time_spent_seconds: newTimeSpent, // 总用时：开始到现在
      last_activity_at: now.toISOString(), // 每次心跳刷新活跃时间
      updated_at: now.toISOString(),
    };


    if (typeof body.current_question_index === "number") {
      updates.current_question_index = Math.max(0, body.current_question_index);
    }

    // 7. 执行更新
    const { data: updatedSession, error: updateErr } = await supabase
      .from("community_quiz_attempt_session")
      .update(updates)
      .eq("id", session.id)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 8. 计算剩余时间（用于客户端倒计时）
    let remainingSeconds: number | null = null;
    if (session.time_limit_minutes && session.started_at) {
      const startTime = new Date(session.started_at);
      const timeLimit = session.time_limit_minutes * 60;
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      remainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
    }

    return NextResponse.json({
      ...updatedSession,
      remaining_seconds: remainingSeconds,
      is_expired: false,
      server_time: now.toISOString(),
    });
  } catch (err: any) {
    console.error("Update session error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

// 辅助函数：自动提交过期的 attempt
async function autoSubmitExpiredAttempt(supabase: any, attemptId: number) {
  try {
    const { data: answers } = await supabase
      .from("community_quiz_attempt_answer")
      .select("id, is_correct")
      .eq("attempt_id", attemptId);

    const total = answers?.length || 0;
    const correct = answers?.filter((a: any) => a.is_correct).length || 0;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    await supabase
      .from("community_quiz_attempt")
      .update({
        status: "submitted",
        score: score,
      })
      .eq("id", attemptId);

    console.log(`Auto-submitted expired attempt ${attemptId} with score ${score}%`);
  } catch (error) {
    console.error(`Failed to auto-submit attempt ${attemptId}:`, error);
  }
}