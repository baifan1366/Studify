import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

type UpdateRequestBody = {
  questionText?: string;
  options?: any[];
  correctAnswers?: any[];
  explanation?: string;
  // 支持前端可能传的两种风格
  questionType?: "single_choice" | "multiple_choice" | "fill_in_blank";
  question_type?: "single_choice" | "multiple_choice" | "fill_in_blank";
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; questionSlug: string }> }
) {
  try {
    const { quizSlug, questionSlug } = await params;
    const supabase = await createClient();

    // 获取当前用户ID（如果已登录）
    let userId = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (err) {
      // 用户未登录，继续处理
    }

    // 先拿 quiz id 和权限信息
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, visibility, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 检查private quiz的访问权限
    if (quiz.visibility === 'private' && userId) {
      const isAuthor = quiz.author_id === userId;
      
      if (!isAuthor) {
        const { data: perms } = await supabase
          .from("community_quiz_permission")
          .select("permission_type")
          .eq("quiz_id", quiz.id)
          .eq("user_id", userId);
        const hasAny = Array.isArray(perms) && perms.length > 0;
        if (!hasAny) {
          return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
      }
    } else if (quiz.visibility === 'private' && !userId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 获取问题详情
    const { data: question, error: questionErr } = await supabase
      .from("community_quiz_question")
      .select("id, public_id, slug, question_type, question_text, options, correct_answers, explanation")
      .eq("quiz_id", quiz.id)
      .eq("slug", questionSlug)
      .maybeSingle();

    if (questionErr || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json(question, { status: 200 });
  } catch (err: any) {
    console.error("Get question error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// Internal helper to handle both PUT and PATCH update logic
async function handleUpdate(
  req: Request,
  paramsPromise: Promise<{ quizSlug: string; questionSlug: string }>
) {
  try {
    const { quizSlug, questionSlug } = await paramsPromise;

    // Auth: must be logged in
    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取 quiz 基本信息
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Permission: author or users with 'edit' permission
    let canEdit = quiz.author_id === userId;
    if (!canEdit) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .limit(5);
      canEdit = !!(perms && perms.some((p: any) => p.permission_type === "edit"));
    }

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 获取问题基本信息
    const { data: question, error: questionErr } = await supabase
      .from("community_quiz_question")
      .select("id, question_type")
      .eq("quiz_id", quiz.id)
      .eq("slug", questionSlug)
      .maybeSingle();

    if (questionErr || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Parse and validate body (partial update)
    const body: UpdateRequestBody = await req.json().catch(() => ({}));
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    // Handle question text
    if (Object.prototype.hasOwnProperty.call(body, "questionText")) {
      const questionText = body.questionText;
      if (questionText != null && (typeof questionText !== "string" || !questionText.trim())) {
        return NextResponse.json({ error: "Invalid question text" }, { status: 400 });
      }
      updates.question_text = questionText?.trim() ?? null;
    }

    // Handle question type
    if (Object.prototype.hasOwnProperty.call(body, "questionType") || 
        Object.prototype.hasOwnProperty.call(body, "question_type")) {
      const question_type = body.question_type ?? body.questionType;
      if (question_type != null && 
          !["single_choice", "multiple_choice", "fill_in_blank"].includes(question_type)) {
        return NextResponse.json({ error: "Invalid question type" }, { status: 400 });
      }
      updates.question_type = question_type;
    }

    // Handle explanation
    if (Object.prototype.hasOwnProperty.call(body, "explanation")) {
      const explanation = body.explanation;
      if (explanation != null && typeof explanation !== "string") {
        return NextResponse.json({ error: "Invalid explanation" }, { status: 400 });
      }
      updates.explanation = explanation ?? "";
    }

    // Handle options and correct answers based on question type
    const finalQuestionType = updates.question_type ?? question.question_type;
    
    if (Object.prototype.hasOwnProperty.call(body, "options") || 
        Object.prototype.hasOwnProperty.call(body, "correctAnswers")) {
      
      const rawOptions = Array.isArray(body.options) ? body.options : [];
      const rawCorrect = Array.isArray(body.correctAnswers) ? body.correctAnswers : [];

      if (finalQuestionType === "fill_in_blank") {
        // For fill-in-blank, options should be empty and correctAnswers are the accepted answers
        const correct_answers = rawCorrect
          .map((a) => (a ?? "").toString().trim())
          .filter(Boolean);
        
        if (correct_answers.length === 0) {
          return NextResponse.json(
            { error: "At least one non-empty correct answer is required for fill-in-blank questions" },
            { status: 400 }
          );
        }
        
        updates.options = [];
        updates.correct_answers = correct_answers;
      } else {
        // For choice questions, validate options and correct answer indices
        const options = rawOptions
          .map((o) => (o ?? "").toString().trim())
          .filter(Boolean);

        if (options.length < 2) {
          return NextResponse.json(
            { error: "Choice questions require at least 2 non-empty options" },
            { status: 400 }
          );
        }

        const indices = rawCorrect
          .map((a) => {
            const n = typeof a === "number" ? a : parseInt(a?.toString?.() ?? "", 10);
            return Number.isNaN(n) ? null : n;
          })
          .filter((n): n is number => n !== null);

        if (indices.length === 0) {
          return NextResponse.json(
            { error: "Please provide at least one correct answer index" },
            { status: 400 }
          );
        }

        if (indices.some((i) => i < 0 || i >= options.length)) {
          return NextResponse.json(
            { error: "Correct answer index out of range" },
            { status: 400 }
          );
        }

        updates.options = options;
        updates.correct_answers = indices.map((i) => i.toString());
      }
    }

    // Ensure there is at least one field to update
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error: updErr } = await supabase
      .from("community_quiz_question")
      .update(updates)
      .eq("id", question.id)
      .select("id, public_id, slug, question_type, question_text, options, correct_answers, explanation")
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("Update question error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; questionSlug: string }> }
) {
  return handleUpdate(req, params);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; questionSlug: string }> }
) {
  return handleUpdate(req, params);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; questionSlug: string }> }
) {
  try {
    const { quizSlug, questionSlug } = await params;

    // Auth: must be logged in
    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取 quiz 基本信息
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Permission: author or users with 'edit' permission
    let canEdit = quiz.author_id === userId;
    if (!canEdit) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .limit(5);
      canEdit = !!(perms && perms.some((p: any) => p.permission_type === "edit"));
    }

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 获取问题基本信息
    const { data: question, error: questionErr } = await supabase
      .from("community_quiz_question")
      .select("id")
      .eq("quiz_id", quiz.id)
      .eq("slug", questionSlug)
      .maybeSingle();

    if (questionErr || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // 删除相关的答案记录（如果有的话）
    await supabase
      .from("community_quiz_attempt_answer")
      .delete()
      .eq("question_id", question.id);

    // 删除问题
    const { error: deleteErr } = await supabase
      .from("community_quiz_question")
      .delete()
      .eq("id", question.id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Question deleted successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("Delete question error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
