import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function POST(
  req: Request,
  context: Promise<{ params: { quizSlug: string } }>
) {
  try {
    const { params } = await context;

    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 找 quiz
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id")
      .eq("slug", params.quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 创建 attempt
    const { data, error } = await supabase
      .from("community_quiz_attempt")
      .insert({
        quiz_id: quiz.id,
        user_id: userId,
        answers: [], // 开始时为空
      })
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Create attempt error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}
