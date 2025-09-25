import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

// GET /api/community/quizzes/[quizSlug]/attempts/session/[sessionPublicId]
// Fetch a session by its public_id, validate ownership and quiz, and return minimal info for hydration
export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string; sessionPublicId: string }> }
) {
  try {
    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();
    const { quizSlug, sessionPublicId } = await params;

    // 1) Resolve quiz by slug
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, slug")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 2) Find session by public_id and ensure ownership + quiz
    const { data: session, error: sessionErr } = await supabase
      .from("community_quiz_attempt_session")
      .select("id, public_id, attempt_id, quiz_id, user_id, status, session_token, time_limit_minutes, time_spent_seconds, current_question_index, started_at, last_activity_at")
      .eq("public_id", sessionPublicId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.quiz_id !== quiz.id) {
      return NextResponse.json({ error: "Session does not belong to this quiz" }, { status: 400 });
    }

    // 3) Validate attempt is still in progress if needed
    const { data: attempt } = await supabase
      .from("community_quiz_attempt")
      .select("id, status, score")
      .eq("id", session.attempt_id)
      .maybeSingle();

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // 4) Return minimal info; client can then hydrate via existing /attempts/[attemptId]/session
    return NextResponse.json({
      session: {
        public_id: session.public_id,
        attempt_id: session.attempt_id,
        status: session.status,
        current_question_index: session.current_question_index,
      },
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
      }
    });
  } catch (err: any) {
    console.error("Get session by public_id error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
