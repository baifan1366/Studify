import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    // Auth: must be logged in
    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // Get quiz basic info
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id, title, max_attempts")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check permissions: author or editor can see all attempts
    let canViewAll = quiz.author_id === userId;
    if (!canViewAll) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .limit(5);
      canViewAll = !!(perms && perms.some((p: any) => p.permission_type === "edit"));
    }

    if (canViewAll) {
      // Author/Editor view: Get all attempts with statistics
      
      // Get all attempts with session data
      const { data: attempts, error: attemptsErr } = await supabase
        .from("community_quiz_attempt")
        .select(`
          id,
          score,
          status,
          created_at,
          user_id,
          community_quiz_attempt_session (
            time_spent_seconds
          )
        `)
        .eq("quiz_id", quiz.id)
        .in("status", ["submitted", "graded"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (attemptsErr) {
        return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
      }

      // Get user profiles separately
      let attemptsWithProfiles = attempts || [];
      if (attempts && attempts.length > 0) {
        const userIds = [...new Set(attempts.map((a: any) => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        // Calculate attempt numbers for each user
        const userAttemptCounts: { [userId: string]: number } = {};
        
        // Sort attempts by user and creation date to calculate attempt numbers
        const sortedAttempts = [...attempts].sort((a: any, b: any) => {
          if (a.user_id !== b.user_id) return a.user_id.localeCompare(b.user_id);
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        // Assign attempt numbers
        sortedAttempts.forEach((attempt: any) => {
          if (!userAttemptCounts[attempt.user_id]) {
            userAttemptCounts[attempt.user_id] = 0;
          }
          userAttemptCounts[attempt.user_id]++;
          attempt.attemptNumber = userAttemptCounts[attempt.user_id];
        });

        // Merge profiles with attempts and flatten session data
        attemptsWithProfiles = attempts.map((attempt: any) => ({
          ...attempt,
          // 正确展平 session 数据：取第一个 session 的 time_spent_seconds
          time_spent_seconds: Array.isArray(attempt.community_quiz_attempt_session) 
            ? attempt.community_quiz_attempt_session[0]?.time_spent_seconds || 0
            : attempt.community_quiz_attempt_session?.time_spent_seconds || 0,
          profiles: profiles?.find((p: any) => p.user_id === attempt.user_id) || null,
          attemptNumber: attempt.attemptNumber
        }));
      }

      // Calculate statistics
      const totalAttempts = attempts?.length || 0;
      const uniqueUsers = new Set(attempts?.map((a: any) => a.user_id)).size;
      
      let avgScore = 0;
      let maxScore = 0;
      let avgTimeSpent = 0;
      let successfulAttempts = 0;

      if (attemptsWithProfiles && attemptsWithProfiles.length > 0) {
        const scores = attemptsWithProfiles.map((a: any) => a.score || 0);
        const times = attemptsWithProfiles.map((a: any) => a.time_spent_seconds || 0);
        
        avgScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        maxScore = Math.max(...scores);
        avgTimeSpent = times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
        
        // Count attempts with score >= 60% (assuming max possible score)
        // We'll need to get total questions to calculate percentage
        const { data: questionCount } = await supabase
          .from("community_quiz_question")
          .select("id", { count: "exact" })
          .eq("quiz_id", quiz.id);
        
        const totalQuestions = questionCount?.length || 1;
        const passingScore = Math.ceil(totalQuestions * 0.6);
        successfulAttempts = attemptsWithProfiles.filter((a: any) => (a.score || 0) >= passingScore).length;
      }

      const statistics = {
        totalAttempts,
        uniqueUsers,
        avgScore: Math.round(avgScore * 100) / 100,
        maxScore,
        avgTimeSpent: Math.round(avgTimeSpent),
        successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0
      };

      return NextResponse.json({
        role: "admin",
        attempts: attemptsWithProfiles || [],
        statistics,
        quiz: {
          title: quiz.title,
          maxAttempts: quiz.max_attempts
        }
      });

    } else {
      // Regular user view: Only their own attempts with profile info
      const { data: userAttempts, error: userAttemptsErr } = await supabase
        .from("community_quiz_attempt")
        .select(`
          id,
          score,
          status,
          created_at,
          user_id,
          community_quiz_attempt_session (
            time_spent_seconds
          )
        `)
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .in("status", ["submitted", "graded"])
        .order("created_at", { ascending: false });

      if (userAttemptsErr) {
        return NextResponse.json({ error: userAttemptsErr.message }, { status: 500 });
      }

      // Get current user's profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId)
        .single();

      // Add attempt numbers, flatten session data, and add profile info
      const attemptsWithNumbers = (userAttempts || []).map((attempt: any, index: number) => ({
        ...attempt,
        // 正确展平 session 数据：取第一个 session 的 time_spent_seconds
        time_spent_seconds: Array.isArray(attempt.community_quiz_attempt_session) 
          ? attempt.community_quiz_attempt_session[0]?.time_spent_seconds || 0
          : attempt.community_quiz_attempt_session?.time_spent_seconds || 0,
        attemptNumber: userAttempts!.length - index,
        profiles: userProfile || null
      }));

      return NextResponse.json({
        role: "user",
        attempts: attemptsWithNumbers,
        quiz: {
          title: quiz.title,
          maxAttempts: quiz.max_attempts,
          userAttemptCount: userAttempts?.length || 0
        }
      });
    }

  } catch (err: any) {
    console.error("Get recent attempts error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
