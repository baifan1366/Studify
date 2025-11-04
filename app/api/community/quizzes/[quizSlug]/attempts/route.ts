import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;

    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 找 quiz
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, max_attempts, visibility, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 检查是否是作者
    const isAuthor = quiz.author_id === userId;

    // 检查用户权限（对于 private quiz）
    let userPermission: 'attempt'|'edit'|null = null;
    if (quiz.visibility === 'private' && !isAuthor) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId);

      const order: Record<'attempt'|'edit', number> = { attempt: 1, edit: 2 };
      if (perms && perms.length > 0) {
        for (const p of perms) {
          const t = p.permission_type as 'attempt'|'edit';
          if (!userPermission || order[t] > order[userPermission]) userPermission = t;
        }
      }

      if (!userPermission) {
        return NextResponse.json(
          { error: "You don't have permission to access this private quiz" },
          { status: 403 }
        );
      }
    }

    // Authors and users with edit permission cannot create actual attempts - they should use preview mode
    if (isAuthor || userPermission === 'edit') {
      return NextResponse.json(
        { 
          error: "Authors and editors cannot create attempts. Use preview mode instead.",
          isPreviewOnly: true 
        },
        { status: 403 }
      );
    }

    // 检查用户已有的 attempts 数量和最近的attempt
    const { data: existingAttempts, error: attemptsErr } = await supabase
      .from("community_quiz_attempt")
      .select("id, created_at, status")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (attemptsErr) {
      return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
    }

    // 检查是否有进行中的attempt
    if (existingAttempts && existingAttempts.length > 0) {
      const inProgressAttempt = existingAttempts.find(attempt => attempt.status === 'in_progress');
      
      if (inProgressAttempt) {
        return NextResponse.json(
          { 
            id: inProgressAttempt.id, 
            created_at: inProgressAttempt.created_at,
            status: inProgressAttempt.status,
            message: "Continue existing attempt" 
          }, 
          { status: 200 }
        );
      }
      
      // 防止重复创建：检查是否在最近10秒内已经创建了attempt
      const latestAttempt = existingAttempts[0];
      const timeDiff = Date.now() - new Date(latestAttempt.created_at).getTime();
      
      if (timeDiff < 10000) { // 10秒内
        return NextResponse.json(
          { 
            id: latestAttempt.id, 
            created_at: latestAttempt.created_at,
            status: latestAttempt.status,
            message: "Attempt already exists" 
          }, 
          { status: 200 }
        );
      }
    }

    // 只计算已完成的attempts (submitted 或 graded 状态)
    const completedAttempts = existingAttempts?.filter(attempt => 
      attempt.status === 'submitted' || attempt.status === 'graded'
    ) || [];
    
    if (completedAttempts.length >= quiz.max_attempts) {
      return NextResponse.json(
        { error: `Maximum attempts (${quiz.max_attempts}) reached for this quiz` },
        { status: 403 }
      );
    }

    // 创建 attempt
    const { data, error } = await supabase
      .from("community_quiz_attempt")
      .insert({
        quiz_id: quiz.id,
        user_id: userId,
        status: 'in_progress',
        score: 0
      })
      .select("id, created_at, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Create attempt error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}
