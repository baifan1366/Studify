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

    // Get all attempts for the user
    const { data: attempts, error } = await supabase
      .from("community_quiz_attempt")
      .select("id, status, score")
      .eq("user_id", authResult.payload.sub);

    if (error) {
      console.error("Error fetching user stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      total_attempts: attempts?.length || 0,
      completed_attempts: attempts?.filter(a => 
        a.status === 'submitted' || a.status === 'graded'
      ).length || 0,
      in_progress_attempts: attempts?.filter(a => 
        a.status === 'in_progress'
      ).length || 0,
      average_score: 0,
      best_score: 0
    };

    // Calculate average and best score from completed attempts
    const completedAttempts = attempts?.filter(a => 
      (a.status === 'submitted' || a.status === 'graded') && a.score !== null
    ) || [];

    if (completedAttempts.length > 0) {
      const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
      stats.average_score = Math.round(totalScore / completedAttempts.length);
      stats.best_score = Math.max(...completedAttempts.map(a => a.score || 0));
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in user stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
