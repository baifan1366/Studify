import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;
    const supabase = await createClient();

    // 获取当前用户ID（如果已登录）
    let userId = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (err) {
      // 用户未登录，继续处理
    }

    // 获取quiz详细信息
    const { data: quiz, error: quizError } = await supabase
      .from("community_quiz")
      .select(`
        id, 
        public_id, 
        slug, 
        title, 
        description, 
        tags, 
        difficulty, 
        max_attempts, 
        visibility, 
        quiz_mode,
        time_limit_minutes,
        author_id,
        created_at
      `)
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 检查private quiz的访问权限
    if (quiz.visibility === 'private' && userId) {
      const isAuthor = quiz.author_id === userId;
      
      if (!isAuthor) {
        // 检查用户是否有权限
        const { data: permission } = await supabase
          .from("community_quiz_permission")
          .select("permission_type")
          .eq("quiz_id", quiz.id)
          .eq("user_id", userId)
          .maybeSingle();
        
        if (!permission) {
          return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
      }
    } else if (quiz.visibility === 'private' && !userId) {
      // 未登录用户无法访问private quiz
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 获取作者信息
    const { data: author } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", quiz.author_id)
      .maybeSingle();

    // 获取quiz的问题数量
    const { count: questionCount } = await supabase
      .from("community_quiz_question")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);

    // 获取quiz的尝试次数统计 (只计算已完成的)
    const { count: attemptCount } = await supabase
      .from("community_quiz_attempt")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id)
      .in("status", ["submitted", "graded"]);

    // 获取quiz的点赞数
    const { count: likeCount } = await supabase
      .from("community_quiz_like")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);

    // 获取最近的尝试记录（用于排行榜）
    const { data: recentAttempts } = await supabase
      .from("community_quiz_attempt")
      .select(`
        id,
        user_id,
        score,
        status,
        created_at,
        profiles!inner(display_name, avatar_url)
      `)
      .eq("quiz_id", quiz.id)
      .in("status", ["submitted", "graded"])
      .gte("score", 80) // 只显示80分以上的成绩
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);

    // 构建返回数据
    const quizWithDetails = {
      ...quiz,
      author: author ? {
        display_name: author.display_name,
        avatar_url: author.avatar_url
      } : null,
      question_count: questionCount || 0,
      attempt_count: attemptCount || 0,
      like_count: likeCount || 0,
      recent_attempts: recentAttempts?.map(attempt => {
        const profile = Array.isArray(attempt.profiles) 
          ? attempt.profiles[0] 
          : attempt.profiles;
        return {
          user_id: attempt.user_id,
          display_name: profile?.display_name || 'Anonymous',
          avatar_url: profile?.avatar_url || null,
          score: attempt.score,
          status: attempt.status,
          completed_at: attempt.created_at
        };
      }) || []
    };

    return NextResponse.json(quizWithDetails, { status: 200 });

  } catch (err: any) {
    console.error("Get quiz detail error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
