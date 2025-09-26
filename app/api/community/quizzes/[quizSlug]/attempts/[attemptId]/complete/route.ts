import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

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

    // 1. 找 attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, quiz_id, status")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (attempt.user_id !== userId) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }
    
    // 检查attempt状态
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    // 2. 直接使用数据库计算答对题目的总数（新的分数计算逻辑）
    const { count: scoreCount, error: scoreErr } = await supabase
      .from("community_quiz_attempt_answer")
      .select("*", { count: "exact", head: true })
      .eq("attempt_id", attempt.id)
      .eq("is_correct", true);

    if (scoreErr) {
      return NextResponse.json({ error: "Failed to calculate score" }, { status: 500 });
    }

    const score = scoreCount || 0;

    // 3. 更新 attempt（标记为已提交并记录分数）
    const { error: updErr } = await supabase
      .from("community_quiz_attempt")
      .update({
        status: 'submitted',
        score: score
      })
      .eq("id", attempt.id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // 4. 获取总题数用于返回统计信息
    const { count: totalQuestions } = await supabase
      .from("community_quiz_attempt_answer")
      .select("*", { count: "exact", head: true })
      .eq("attempt_id", attempt.id);

    return NextResponse.json({ 
      total: totalQuestions || 0, 
      correct: score, // 新逻辑：分数就是答对的题目总数
      score: score,
      percentage: totalQuestions ? Math.round((score / totalQuestions) * 100) : 0
    }, { status: 200 });
  } catch (err: any) {
    console.error("Complete attempt error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}
