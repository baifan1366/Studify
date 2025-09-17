import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

type RequestBody = {
  public_id: string;
  questionText?: string;
  options?: any[];
  correctAnswers?: any[];
  explanation?: string;
  // 支持前端可能传的两种风格
  questionType?: "single_choice" | "multiple_choice" | "fill_in_blank";
  question_type?: "single_choice" | "multiple_choice" | "fill_in_blank";
};

function makeBaseSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  const { quizSlug } = await params;

  const supabase = await createClient();

  // 先拿 quiz id（不要把 promise 放进 .eq）
  const { data: quiz, error: quizErr } = await supabase
    .from("community_quiz")
    .select("id")
    .eq("slug", quizSlug)
    .maybeSingle();

  if (quizErr || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("community_quiz_question")
    .select(
      "public_id, slug, question_type, question_text, options, correct_answers, explanation"
    )
    .eq("quiz_id", quiz.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { quizSlug } = await params;

    const body: RequestBody = await req.json();

    const questionText = body.questionText;
    const rawOptions = Array.isArray(body.options) ? body.options : [];
    const rawCorrect = Array.isArray(body.correctAnswers)
      ? body.correctAnswers
      : [];

    // accept either field name
    const question_type = (body.question_type ??
      body.questionType ??
      "single_choice") as "single_choice" | "multiple_choice" | "fill_in_blank";

    if (!questionText) {
      return NextResponse.json(
        { error: "Question text is required" },
        { status: 400 }
      );
    }

    if (
      !["single_choice", "multiple_choice", "fill_in_blank"].includes(
        question_type
      )
    ) {
      return NextResponse.json(
        { error: "Invalid question_type" },
        { status: 400 }
      );
    }

    // 找 quiz_id
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // sanitize options
    let options = rawOptions
      .map((o) => (o ?? "").toString().trim())
      .filter(Boolean);

    // sanitize correct answers
    let correct_answers: string[] = [];

    if (question_type === "fill_in_blank") {
      correct_answers = rawCorrect
        .map((a) => (a ?? "").toString().trim())
        .filter(Boolean);
      if (correct_answers.length === 0) {
        return NextResponse.json(
          { error: "At least one non-empty correct answer is required" },
          { status: 400 }
        );
      }
      options = [];
    } else {
      if (options.length < 2) {
        return NextResponse.json(
          { error: "Choice questions require at least 2 non-empty options" },
          { status: 400 }
        );
      }

      const indices = rawCorrect
        .map((a) => {
          const n =
            typeof a === "number" ? a : parseInt(a?.toString?.() ?? "", 10);
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

      correct_answers = indices.map((i) => i.toString());
    }

    const baseSlug = makeBaseSlug(questionText) || "q";
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const { data: existing, error: selErr } = await supabase
        .from("community_quiz_question")
        .select("id")
        .eq("quiz_id", quiz.id)
        .eq("slug", slug)
        .maybeSingle();

      if (selErr) {
        return NextResponse.json({ error: selErr.message }, { status: 500 });
      }

      if (existing) {
        slug = `${baseSlug}-${suffix++}`;
        continue;
      }

      const { data, error } = await supabase
        .from("community_quiz_question")
        .insert({
          quiz_id: quiz.id,
          slug,
          question_type, // ✅ 用 sanitize 后的值
          question_text: questionText,
          options,
          correct_answers,
          explanation: body.explanation ?? "",
        })
        .select("public_id, slug")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }
  } catch (err: any) {
    console.error("Create question error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
