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

    // Get private quizzes shared with the user through community_quiz_permission
    const { data: permissions, error } = await supabase
      .from("community_quiz_permission")
      .select(`
        id,
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
          tags,
          difficulty,
          max_attempts,
          visibility,
          time_limit_minutes,
          created_at,
          author_id
        )
      `)
      .eq("user_id", authResult.payload.sub)
      .eq("quiz.visibility", "private")
      .or("expires_at.is.null,expires_at.gt.now()");

    if (error) {
      console.error("Error fetching shared private quizzes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get granter profile information
    const granterIds = permissions?.map(p => p.granted_by).filter(Boolean) || [];
    let granterProfiles: any[] = [];
    
    if (granterIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, full_name, avatar_url")
        .in("user_id", granterIds);
      
      if (profileError) {
        console.error("Error fetching granter profiles:", profileError);
      }
      
      granterProfiles = profiles || [];
      console.log("Granter IDs:", granterIds);
      console.log("Granter profiles:", granterProfiles);
    }

    // Format the response
    const formattedQuizzes = permissions?.map(perm => {
      const quiz = Array.isArray(perm.quiz) ? perm.quiz[0] : perm.quiz;
      const granter = granterProfiles.find(p => p.user_id === perm.granted_by);
      
      return {
        quiz_id: quiz.id,
        quiz_slug: quiz.slug,
        title: quiz.title,
        description: quiz.description,
        tags: quiz.tags,
        difficulty: quiz.difficulty,
        max_attempts: quiz.max_attempts,
        time_limit_minutes: quiz.time_limit_minutes,
        permission_type: perm.permission_type,
        expires_at: perm.expires_at,
        granted_by: perm.granted_by,
        granted_by_name: granter?.display_name || granter?.full_name || 'Unknown User',
        granted_by_avatar: granter?.avatar_url || null,
        permission_created_at: perm.created_at
      };
    }) || [];

    // Sort by most recent permission grant first
    formattedQuizzes.sort((a, b) => {
      const dateA = new Date(a.permission_created_at).getTime();
      const dateB = new Date(b.permission_created_at).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ quizzes: formattedQuizzes });
  } catch (error) {
    console.error("Error in shared private quizzes API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
