import { NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();

    // Get all attempts with quiz details
    const { data: attempts, error } = await supabase
      .from("community_quiz_attempt")
      .select(`
        id,
        quiz_id,
        status,
        score,
        created_at,
        quiz:community_quiz!inner(
          id,
          title,
          slug,
          difficulty
        )
      `)
      .eq("user_id", authResult.payload.sub)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all user attempts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get question counts and correct answers for each attempt
    const attemptIds = attempts?.map(a => a.id) || [];
    if (attemptIds.length > 0) {
      const { data: answerData } = await supabase
        .from("community_quiz_attempt_answer")
        .select("attempt_id, is_correct")
        .in("attempt_id", attemptIds);

      // Calculate stats for each attempt
      const attemptStats = answerData?.reduce((acc: any, answer) => {
        if (!acc[answer.attempt_id]) {
          acc[answer.attempt_id] = { total: 0, correct: 0 };
        }
        acc[answer.attempt_id].total++;
        if (answer.is_correct) {
          acc[answer.attempt_id].correct++;
        }
        return acc;
      }, {});

      // Merge stats with attempts
      const attemptsWithStats = attempts?.map(attempt => ({
        ...attempt,
        total_questions: attemptStats?.[attempt.id]?.total || 0,
        correct_answers: attemptStats?.[attempt.id]?.correct || 0
      }));

      return NextResponse.json(attemptsWithStats || []);
    }

    return NextResponse.json(attempts || []);
  } catch (error) {
    console.error("Error in all attempts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
