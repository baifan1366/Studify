import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

// GET /api/community/quizzes/attempts/[attemptId]/score
// 根据 attemptId 计算答对题目的总数
export async function GET(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();
    const { attemptId } = await params;

    // 验证 attempt 是否存在且属于当前用户
    const { data: attempt, error: attemptError } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, status")
      .eq("id", parseInt(attemptId))
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 使用数据库的 count() 功能统计答对的题目总数
    const { count: correctAnswersCount, error: countError } = await supabase
      .from("community_quiz_attempt_answer")
      .select("*", { count: "exact", head: true })
      .eq("attempt_id", parseInt(attemptId))
      .eq("is_correct", true);

    if (countError) {
      console.error("Error counting correct answers:", countError);
      return NextResponse.json({ error: "Failed to calculate score" }, { status: 500 });
    }

    // 返回答对的题目总数作为分数
    return NextResponse.json({ 
      score: correctAnswersCount || 0 
    }, { status: 200 });

  } catch (error) {
    console.error("Score calculation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
