import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

type Body = {
  title: string;
  description?: string;
  difficulty?: number; // 1-5
  tags?: string[];
  max_attempts?: number;
  visibility?: 'public' | 'private';
};

/** 使用你提供的 slugify（严格按你给的实现） */
function makeBaseSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50);
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");

    let quizzes;
    let quizError;

    // 根据 filter 参数决定查询逻辑
    if (filter === "mine") {
      // 获取当前用户创建的所有 quiz（需要验证身份）
      const authResult = await authorize("student");
      if (authResult instanceof NextResponse) {
        return NextResponse.json([], { status: 200 }); // 未登录返回空数组
      }
      const { sub: userId } = authResult;

      const result = await supabase
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
          author_id,
          created_at
        `)
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      quizzes = result.data;
      quizError = result.error;
    } else if (filter === "popular") {
      // 获取所有公开 quiz，按热度排序（根据 attempts 数量和创建时间）
      const result = await supabase
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
          author_id,
          created_at,
          community_quiz_attempt(id)
        `)
        .eq("visibility", "public")
        .eq("is_deleted", false);

      if (result.error) {
        quizError = result.error;
      } else {
        // 计算每个 quiz 的 attempt 数量并排序
        const quizzesWithCounts = result.data?.map(quiz => ({
          ...quiz,
          attempts_count: quiz.community_quiz_attempt?.length || 0,
          community_quiz_attempt: undefined // 移除这个字段，不返回给前端
        })) || [];

        // 按 attempts 数量降序，然后按创建时间降序排序
        quizzes = quizzesWithCounts.sort((a, b) => {
          if (a.attempts_count !== b.attempts_count) {
            return b.attempts_count - a.attempts_count;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }
    } else {
      // 默认：返回所有公开 quiz
      const result = await supabase
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
          author_id,
          created_at
        `)
        .eq("visibility", "public")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      quizzes = result.data;
      quizError = result.error;
    }

    if (quizError) {
      return NextResponse.json({ error: quizError.message }, { status: 500 });
    }

    if (!quizzes || quizzes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 获取所有作者的ID
    const authorIds = [...new Set(quizzes.map(quiz => quiz.author_id))];

    // 获取作者信息
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", authorIds);

    if (profileError) {
      console.warn("Failed to fetch author profiles:", profileError);
    }

    // 将作者信息合并到quiz数据中
    const quizzesWithAuthors = quizzes.map(quiz => {
      const author = profiles?.find(profile => profile.user_id === quiz.author_id);
      return {
        ...quiz,
        author: author ? {
          display_name: author.display_name,
          avatar_url: author.avatar_url
        } : null
      };
    });

    return NextResponse.json(quizzesWithAuthors, { status: 200 });
  } catch (err: any) {
    console.error("Fetch quizzes error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1. 校验身份
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { sub: userId } = authResult;

    const supabase = await createClient();

    const body: Body = await req.json();
    const { 
      title, 
      description = null, 
      difficulty = 1, 
      tags = [], 
      max_attempts = 1, 
      visibility = 'public' 
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const baseSlug = makeBaseSlug(title);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const { data: existing, error: selErr } = await supabase
        .from("community_quiz")
        .select("id")
        .eq("slug", slug)
        .limit(1);

      if (selErr) {
        return NextResponse.json({ error: selErr.message }, { status: 500 });
      }

      if (existing && existing.length > 0) {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
        continue;
      }

      const { data, error } = await supabase
        .from("community_quiz")
        .insert({
          slug,
          title,
          description,
          difficulty,
          tags,
          max_attempts,
          visibility,
          author_id: userId, // 关键：记录是谁创建的
        })
        .select("slug, public_id")
        .single();

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (
          msg.includes("duplicate") ||
          msg.includes("unique") ||
          (error.code && error.code === "23505")
        ) {
          suffix++;
          slug = `${baseSlug}-${suffix}`;
          continue;
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }
  } catch (err: any) {
    console.error("Create quiz error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
