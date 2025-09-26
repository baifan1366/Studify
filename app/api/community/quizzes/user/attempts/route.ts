import { NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    let query = supabase
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
          difficulty,
          tags
        )
      `)
      .eq("user_id", authResult.payload.sub)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error("Error fetching user attempts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get question counts for each attempt
    const attemptIds = attempts?.map(a => a.id) || [];
    if (attemptIds.length > 0) {
      const { data: answerCounts } = await supabase
        .from("community_quiz_attempt_answer")
        .select("attempt_id, is_correct")
        .in("attempt_id", attemptIds);

      // Group by attempt_id and calculate stats
      const attemptStats = answerCounts?.reduce((acc: any, answer) => {
        if (!acc[answer.attempt_id]) {
          acc[answer.attempt_id] = { total: 0, correct: 0 };
        }
        acc[answer.attempt_id].total++;
        if (answer.is_correct) {
          acc[answer.attempt_id].correct++;
        }
        return acc;
      }, {});

      // Add stats to attempts
      const attemptsWithStats = attempts?.map(attempt => ({
        ...attempt,
        total_questions: attemptStats?.[attempt.id]?.total || 0,
        correct_answers: attemptStats?.[attempt.id]?.correct || 0
      }));

      return NextResponse.json(attemptsWithStats || []);
    }

    return NextResponse.json(attempts || []);
  } catch (error) {
    console.error("Error in user attempts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
