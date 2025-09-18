import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 找 quiz
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

    // 检查 quiz 是否为 public（如果是 private 需要权限检查）
    if (quiz.visibility === 'private' && !isAuthor) {
      // 检查用户是否有权限（通过community_quiz_permission表）
      const { data: permission } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .in("permission_type", ["attempt", "edit"])
        .maybeSingle();
      
      if (!permission) {
        return NextResponse.json(
          { error: "You don't have permission to access this private quiz" },
          { status: 403 }
        );
      }
    }

    // 检查用户已有的 attempts 数量
    const { data: existingAttempts, error: attemptsErr } = await supabase
      .from("community_quiz_attempt")
      .select("id")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId);

    if (attemptsErr) {
      return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
    }

    // 作者可以无限制预览自己的quiz
    if (!isAuthor && existingAttempts && existingAttempts.length >= quiz.max_attempts) {
      return NextResponse.json(
        { error: `Maximum attempts (${quiz.max_attempts}) reached for this quiz` },
        { status: 403 }
      );
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
