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
      .select("id, max_attempts, visibility, quiz_mode")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
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
    const canAttempt = attemptCount < quiz.max_attempts;

    return NextResponse.json({
      attemptCount,
      maxAttempts: quiz.max_attempts,
      canAttempt,
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
