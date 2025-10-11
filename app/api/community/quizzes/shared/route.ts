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

    // Get quizzes shared with the user (both private and public with explicit permissions)
    const { data: permissions, error: permError } = await supabase
      .from("community_quiz_permission")
      .select(`
        quiz_id,
        permission_type,
        expires_at,
        created_at,
        granted_by,
        quiz:community_quiz!inner(
          id,
          public_id,
          slug,
          title,
          description,
          difficulty,
          max_attempts,
          visibility,
          time_limit_minutes,
          created_at,
          author_id,
          author:profile!community_quiz_author_id_fkey(
            id,
            name,
            avatar_url
          )
        ),
        granter:profile!community_quiz_permission_granted_by_fkey(
          id,
          name,
          avatar_url
        )
      `)
      .eq("user_id", authResult.payload.sub)
      .or("expires_at.is.null,expires_at.gt.now()");

    if (permError) {
      console.error("Error fetching shared quizzes:", permError);
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    // Also get public quizzes that the user has attempted
    const { data: publicAttempted, error: attemptError } = await supabase
      .from("community_quiz_attempt")
      .select(`
        quiz:community_quiz!inner(
          id,
          public_id,
          slug,
          title,
          description,
          difficulty,
          max_attempts,
          visibility,
          time_limit_minutes,
          created_at,
          author_id,
          author:profile!community_quiz_author_id_fkey(
            id,
            name,
            avatar_url
          )
        )
      `)
      .eq("user_id", authResult.payload.sub)
      .eq("quiz.visibility", "public")
      .not("quiz", "is", null);

    if (attemptError) {
      console.error("Error fetching public attempted quizzes:", attemptError);
    }

    // Format the response
    const sharedQuizzes = permissions?.map(perm => ({
      ...(Array.isArray(perm.quiz) ? perm.quiz[0] : perm.quiz),
      permission_type: perm.permission_type,
      granted_by: Array.isArray(perm.granter) ? perm.granter[0] : perm.granter,
      expires_at: perm.expires_at,
      permission_created_at: perm.created_at
    })) || [];

    // Add public quizzes that user has attempted (without duplicates)
    const sharedQuizIds = new Set(sharedQuizzes.map(q => q.id));
    const publicQuizzes = publicAttempted?.filter(item => {
      const quiz = Array.isArray(item.quiz) ? item.quiz[0] : item.quiz;
      return quiz && !sharedQuizIds.has(quiz.id);
    }).map(item => {
      const quiz = Array.isArray(item.quiz) ? item.quiz[0] : item.quiz;
      return {
        ...quiz,
        permission_type: 'attempt' as const,
        granted_by: null,
        expires_at: null,
        permission_created_at: null
      };
    }) || [];

    const allSharedQuizzes = [...sharedQuizzes, ...publicQuizzes];

    // Sort by most recent first
    allSharedQuizzes.sort((a, b) => {
      const dateA = new Date(a.permission_created_at || a.created_at).getTime();
      const dateB = new Date(b.permission_created_at || b.created_at).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(allSharedQuizzes);
  } catch (error) {
    console.error("Error in shared quizzes API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
