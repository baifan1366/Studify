import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; attemptId: string }> }
) {
  try {
    const auth = await authorize("student");
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

    // 2. 找所有答案
    const { data: answers, error: ansErr } = await supabase
      .from("community_quiz_attempt_answer")
      .select("id, is_correct, question_id")
      .eq("attempt_id", attempt.id);

    if (ansErr) {
      return NextResponse.json({ error: ansErr.message }, { status: 500 });
    }

    const total = answers?.length || 0;
    const correct = answers?.filter((a) => a.is_correct).length || 0;
    
    // 计算分数 (按百分制)
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

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

    return NextResponse.json({ 
      total, 
      correct, 
      score,
      percentage: score
    }, { status: 200 });
  } catch (err: any) {
    console.error("Complete attempt error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}
