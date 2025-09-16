import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function POST(
  req: Request,
  { params }: { params: { quizSlug: string; attemptId: string } }
) {
  try {
    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();
    const body = await req.json();
    const { question_id, user_answer } = body as {
      question_id: string; // ⚡ 改成 string，因为 public_id 是 uuid
      user_answer: string[];
    };

    // 1. 检查 attempt 是否存在并且属于这个用户
    const { data: attempt, error: attemptErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, quiz_id")
      .eq("id", params.attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (attempt.user_id !== userId) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }

    // 2. 找到对应的 question（用 public_id + quiz_id 双重约束）
    const { data: question, error: questionErr } = await supabase
      .from("community_quiz_question")
      .select("id, correct_answers, question_type")
      .eq("public_id", question_id) // ✅ 改用 public_id
      .eq("quiz_id", attempt.quiz_id) // ✅ 确保属于同一个 quiz
      .maybeSingle();

    if (questionErr || !question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // 3. 判断答案是否正确
    let correct = false;
    if (question.question_type === "fill_in_blank") {
      const normalize = (arr: string[]) =>
        (arr ?? [])
          .map((a) => a.trim().toLowerCase())
          .sort()
          .join(",");
      correct =
        normalize(question.correct_answers ?? []) ===
        normalize(user_answer ?? []);
    } else {
      correct =
        (question.correct_answers ?? []).sort().join(",") ===
        (user_answer ?? []).sort().join(",");
    }

    // 4. 插入 attempt_answer
    const { data, error } = await supabase
      .from("community_quiz_attempt_answer")
      .insert({
        attempt_id: attempt.id,
        question_id: question.id, // ⚡ 存内部主键 id，而不是 public_id
        user_answer,
        is_correct: correct,
      })
      .select("id, is_correct")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Submit answer error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}
