import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  try {
    const { quizSlug } = await params;
    const supabase = await createClient();

    // 获取当前用户ID（如果已登录）
    let userId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      userId = authData?.user?.id ?? null;
    } catch (err) {
      // 未登录则继续
    }

    // 获取 quiz 基本信息（保持你原来字段）
    const { data: quiz, error: quizError } = await supabase
      .from("community_quiz")
      .select(
        `id, public_id, slug, title, description, tags, difficulty, max_attempts, visibility, time_limit_minutes, author_id, created_at`
      )
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 权限检查（private quiz）
    if (quiz.visibility === "private" && userId) {
      const isAuthor = quiz.author_id === userId;
      if (!isAuthor) {
        const { data: perms } = await supabase
          .from("community_quiz_permission")
          .select("permission_type")
          .eq("quiz_id", quiz.id)
          .eq("user_id", userId);

        if (!perms || perms.length === 0) {
          return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
      }
    } else if (quiz.visibility === "private" && !userId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 作者信息
    const { data: author } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", quiz.author_id)
      .maybeSingle();

    // 题目数、尝试数、点赞数（保留）
    const { count: questionCount } = await supabase
      .from("community_quiz_question")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);

    const { count: attemptCount } = await supabase
      .from("community_quiz_attempt")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id)
      .in("status", ["submitted", "graded"]);

    const { count: likeCount } = await supabase
      .from("community_quiz_like")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);

    // ========== Leaderboard 逻辑 ==========
    // 1) 先拿到最近一批已提交/已评分的 attempts（按 score desc, created_at asc 排序）
    //    为了避免一次性拉取过多行，我们可以设定合理的 limit（例如 500）
    const { data: attempts, error: attemptsError } = await supabase
      .from("community_quiz_attempt")
      .select("id, user_id, score, status, created_at")
      .eq("quiz_id", quiz.id)
      .in("status", ["submitted", "graded"])
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(500);

    if (attemptsError) {
      console.error("Error fetching attempts:", attemptsError);
    }

    // 如果没有 attempts，返回空 leaderboard
    let leaderboard: any[] = [];

    if (attempts && attempts.length > 0) {
      // 2) 获取对应 attempt 的 session 信息（包含 time_spent_seconds）
      const attemptIds = attempts.map((a: any) => a.id);
      const { data: sessions, error: sessionsError } = await supabase
        .from("community_quiz_attempt_session")
        .select("attempt_id, user_id, time_spent_seconds, created_at, status")
        .in("attempt_id", attemptIds);

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
      }

      // 3) 找到每个 user 的 best attempt（js 层面合并逻辑）
      //    规则：优先 score 更高；若 score 相同，则 time_spent_seconds 更少更优；再 tie-breaker 用 created_at 早的优先
      const bestByUser = new Map<string, any>();

      // 快速用 sessions map: attemptId -> session
      const sessionByAttempt = new Map<number, any>();
      (sessions || []).forEach((s: any) => {
        sessionByAttempt.set(s.attempt_id, s);
      });

      for (const at of attempts) {
        const user = at.user_id;
        const session = sessionByAttempt.get(at.id) || null;
        const timeSpent = session?.time_spent_seconds ?? null;
        const candidate = {
          attempt_id: at.id,
          user_id: user,
          score: at.score,
          time_spent_seconds: timeSpent,
          completed_at: at.created_at,
        };

        const prev = bestByUser.get(user);
        if (!prev) {
          bestByUser.set(user, candidate);
        } else {
          // 比较 prev vs candidate
          if (candidate.score > prev.score) {
            bestByUser.set(user, candidate);
          } else if (candidate.score === prev.score) {
            // 如果两者都存在 time_spent，比较用时（越短越好）
            if (
              candidate.time_spent_seconds !== null &&
              prev.time_spent_seconds !== null
            ) {
              if (candidate.time_spent_seconds < prev.time_spent_seconds) {
                bestByUser.set(user, candidate);
              } else if (
                candidate.time_spent_seconds === prev.time_spent_seconds &&
                new Date(candidate.completed_at) < new Date(prev.completed_at)
              ) {
                bestByUser.set(user, candidate);
              }
            } else {
              // 如果缺少 time_spent，使用 completed_at 作为 tie-breaker
              if (new Date(candidate.completed_at) < new Date(prev.completed_at)) {
                bestByUser.set(user, candidate);
              }
            }
          }
        }
      }

      // 4) 从 bestByUser 中生成数组，并拉取用户 profiles
      const bestAttempts = Array.from(bestByUser.values());

      const userIds = bestAttempts.map((b) => b.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const profileById = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileById.set(p.user_id, p));

      // 5) 排序（score desc, time_spent_seconds asc (nulls last), completed_at asc）
      leaderboard = bestAttempts
        .map((b) => ({
          ...b,
          display_name: profileById.get(b.user_id)?.display_name ?? "Anonymous",
          avatar_url: profileById.get(b.user_id)?.avatar_url ?? null,
        }))
        .sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          const ta = a.time_spent_seconds;
          const tb = b.time_spent_seconds;
          if (ta == null && tb == null) {
            return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
          } else if (ta == null) {
            return 1; // nulls last
          } else if (tb == null) {
            return -1;
          } else if (ta !== tb) {
            return ta - tb; // less time wins
          } else {
            return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
          }
        });

      // 6) 加入 rank（从 1 开始）
      leaderboard = leaderboard.map((entry: any, idx: number) => ({
        rank: idx + 1,
        ...entry,
      }));
    }

    // 构建返回数据
    const quizWithDetails = {
      ...quiz,
      author: author
        ? { display_name: author.display_name, avatar_url: author.avatar_url }
        : null,
      question_count: questionCount || 0,
      attempt_count: attemptCount || 0,
      like_count: likeCount || 0,
      leaderboard: leaderboard.slice(0, 50), // 返回前 50（可按需调整）
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

// Internal helper to handle both PUT and PATCH update logic
async function handleUpdate(
  req: Request,
  paramsPromise: Promise<{ quizSlug: string }>
) {
  try {
    const { quizSlug } = await paramsPromise;

    // Auth: must be logged in
    const auth = await authorize("student");
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // Fetch quiz basic info
    const { data: quiz, error: quizErr } = await supabase
      .from("community_quiz")
      .select("id, author_id")
      .eq("slug", quizSlug)
      .maybeSingle();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Permission: author or users with 'edit' permission
    let canEdit = quiz.author_id === userId;
    if (!canEdit) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId)
        .limit(5);
      canEdit = !!(perms && perms.some((p: any) => p.permission_type === "edit"));
    }

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body (partial update)
    const body = await req.json().catch(() => ({}));
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (Object.prototype.hasOwnProperty.call(body, "slug")) {
      return NextResponse.json({ error: "Slug cannot be updated" }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (Object.prototype.hasOwnProperty.call(body, "title")) {
      const title = body.title;
      if (title != null && (typeof title !== "string" || !title.trim())) {
        return NextResponse.json({ error: "Invalid title" }, { status: 400 });
      }
      updates.title = title?.trim() ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      const description = body.description;
      if (description != null && typeof description !== "string") {
        return NextResponse.json({ error: "Invalid description" }, { status: 400 });
      }
      updates.description = description ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "difficulty")) {
      const difficulty = body.difficulty;
      if (
        difficulty != null &&
        !(typeof difficulty === "number" && difficulty >= 1 && difficulty <= 5)
      ) {
        return NextResponse.json({ error: "Invalid difficulty (1-5)" }, { status: 400 });
      }
      updates.difficulty = difficulty;
    }

    // Temporarily disable updating 'tags' field. Incoming 'tags' will be ignored.
    // if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    //   const tags = body.tags;
    //   if (tags != null && !Array.isArray(tags)) {
    //     return NextResponse.json({ error: "Invalid tags (must be string array)" }, { status: 400 });
    //   }
    //   updates.tags = Array.isArray(tags) ? tags.map((t: any) => String(t)) : null;
    // }

    if (Object.prototype.hasOwnProperty.call(body, "max_attempts")) {
      const max_attempts = body.max_attempts;
      if (
        max_attempts != null &&
        !(Number.isInteger(max_attempts) && max_attempts >= 1)
      ) {
        return NextResponse.json({ error: "Invalid max_attempts (>=1)" }, { status: 400 });
      }
      updates.max_attempts = max_attempts;
    }

    if (Object.prototype.hasOwnProperty.call(body, "visibility")) {
      const visibility = body.visibility;
      if (
        visibility != null &&
        !["public", "private"].includes(visibility)
      ) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
      updates.visibility = visibility;
    }

    if (Object.prototype.hasOwnProperty.call(body, "time_limit_minutes")) {
      const time_limit_minutes = body.time_limit_minutes;
      if (
        time_limit_minutes !== null &&
        time_limit_minutes !== undefined &&
        !(Number.isInteger(time_limit_minutes) && time_limit_minutes > 0)
      ) {
        return NextResponse.json({ error: "Invalid time_limit_minutes (>0 or null)" }, { status: 400 });
      }
      updates.time_limit_minutes = time_limit_minutes ?? null;
    }

    // Ensure there is at least one field to update
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error: updErr } = await supabase
      .from("community_quiz")
      .update(updates)
      .eq("id", quiz.id)
      .select(
        `id, public_id, slug, title, description, tags, difficulty, max_attempts, visibility, time_limit_minutes, author_id, created_at`
      )
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("Update quiz error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  return handleUpdate(req, params);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizSlug: string }> }
) {
  return handleUpdate(req, params);
}

