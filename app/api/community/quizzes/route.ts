import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { 
  parseSearchQueryParams, 
  validateSearchParams, 
  getSearchVectorColumn, 
  buildTsQuery,
  DEFAULT_SEARCH_PARAMS 
} from "@/utils/quiz/search-utils";

type Body = {
  title: string;
  description?: string;
  difficulty?: number; // 1-5
  max_attempts?: number;
  visibility?: 'public' | 'private';
  subject_id?: number;
  grade_id?: number;
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

/** Helper function to filter out quizzes with no questions */
async function filterQuizzesWithQuestions(supabase: any, quizzes: any[]) {
  if (!quizzes || quizzes.length === 0) {
    return [];
  }

  const quizIds = quizzes.map((quiz: any) => quiz.id);
  const { data: questionCounts, error } = await supabase
    .from("community_quiz_question")
    .select("quiz_id")
    .in("quiz_id", quizIds);

  if (error || !questionCounts) {
    console.error("Error fetching question counts:", error);
    return quizzes; // Return all quizzes if we can't check question counts
  }

  // Get quiz IDs that have at least one question
  const quizIdsWithQuestions = new Set(questionCounts.map((q: any) => q.quiz_id));
  
  // Filter quizzes to only include those with questions
  return quizzes.filter((quiz: any) => quizIdsWithQuestions.has(quiz.id));
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");
    
    // Parse search parameters
    const searchQuery = parseSearchQueryParams(searchParams);
    const validationErrors = validateSearchParams(searchQuery);
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(', ') }, 
        { status: 400 }
      );
    }
    
    // Apply defaults
    const {
      query,
      locale = 'en',
      subject_id,
      grade_id,
      difficulty,
      limit = DEFAULT_SEARCH_PARAMS.limit,
      offset = DEFAULT_SEARCH_PARAMS.offset,
      sort = DEFAULT_SEARCH_PARAMS.sort,
      order = DEFAULT_SEARCH_PARAMS.order
    } = searchQuery;

    let quizzes;
    let quizError;

    // 根据 filter 参数决定查询逻辑
    if (filter === "mine") {
      // 获取当前用户创建的所有 quiz（需要验证身份）
      const authResult = await authorize(["student", "tutor"]);
      if (authResult instanceof NextResponse) {
        return NextResponse.json([], { status: 200 }); // 未登录返回空数组
      }
      const { sub: userId } = authResult;

      let queryBuilder = supabase
        .from("community_quiz")
        .select(`
          *,
          subject:community_quiz_subject!subject_id(
            id,
            code,
            translations
          ),
          grade:community_quiz_grade!grade_id(
            id,
            code,
            translations
          )
        `)
        .eq("author_id", userId)
        .eq("is_deleted", false);

      // Apply filters
      if (subject_id) {
        queryBuilder = queryBuilder.eq("subject_id", subject_id);
      }
      if (grade_id) {
        queryBuilder = queryBuilder.eq("grade_id", grade_id);
      }
      if (difficulty) {
        queryBuilder = queryBuilder.eq("difficulty", difficulty);
      }

      const result = await queryBuilder.order("created_at", { ascending: false });

      quizzes = result.data;
      quizError = result.error;
    } else if (filter === "popular") {
      // 获取所有公开 quiz，按热度排序（根据 attempts 数量和创建时间）
      // Only show quizzes with at least 1 question for community users
      let queryBuilder = supabase
        .from("community_quiz")
        .select(`
          *,
          community_quiz_attempt(id),
          subject:community_quiz_subject!subject_id(
            id,
            code,
            translations
          ),
          grade:community_quiz_grade!grade_id(
            id,
            code,
            translations
          )
        `)
        .eq("visibility", "public")
        .eq("is_deleted", false);

      // Apply filters
      if (subject_id) {
        queryBuilder = queryBuilder.eq("subject_id", subject_id);
      }
      if (grade_id) {
        queryBuilder = queryBuilder.eq("grade_id", grade_id);
      }
      if (difficulty) {
        queryBuilder = queryBuilder.eq("difficulty", difficulty);
      }

      const result = await queryBuilder;

      if (result.error) {
        quizError = result.error;
      } else {
        // Filter out quizzes with no questions for community view
        const validQuizzes = await filterQuizzesWithQuestions(supabase, result.data || []);
        
        // 计算每个 quiz 的 attempt 数量并排序
        const quizzesWithCounts = validQuizzes?.map((quiz: any) => {
          // Handle the case where Supabase returns arrays for foreign key relationships
          const subjectData = Array.isArray(quiz.subject) 
            ? quiz.subject[0] 
            : quiz.subject;
          const gradeData = Array.isArray(quiz.grade) 
            ? quiz.grade[0] 
            : quiz.grade;
            
          return {
            ...quiz,
            attempts_count: quiz.community_quiz_attempt?.length || 0,
            community_quiz_attempt: undefined, // 移除这个字段，不返回给前端
            subject: subjectData ? {
              id: subjectData.id,
              code: subjectData.code,
              translations: subjectData.translations
            } : null,
            grade: gradeData ? {
              id: gradeData.id,
              code: gradeData.code,
              translations: gradeData.translations
            } : null
          };
        }) || [];

        // 按 attempts 数量降序，然后按创建时间降序排序
        quizzes = quizzesWithCounts.sort((a: any, b: any) => {
          if (a.attempts_count !== b.attempts_count) {
            return b.attempts_count - a.attempts_count;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }
    } else {
      // 默认：返回所有公开 quiz
      // Only show quizzes with at least 1 question for community users
      let queryBuilder = supabase
        .from("community_quiz")
        .select(`
          *,
          subject:community_quiz_subject!subject_id(
            id,
            code,
            translations
          ),
          grade:community_quiz_grade!grade_id(
            id,
            code,
            translations
          )
        `)
        .eq("visibility", "public")
        .eq("is_deleted", false);

      // Apply filters
      if (subject_id) {
        queryBuilder = queryBuilder.eq("subject_id", subject_id);
      }
      if (grade_id) {
        queryBuilder = queryBuilder.eq("grade_id", grade_id);
      }
      if (difficulty) {
        queryBuilder = queryBuilder.eq("difficulty", difficulty);
      }

      const result = await queryBuilder.order("created_at", { ascending: false });

      if (result.error) {
        quizError = result.error;
      } else {
        // Filter out quizzes with no questions for community view
        quizzes = await filterQuizzesWithQuestions(supabase, result.data || []);
      }
    }

    if (quizError) {
      return NextResponse.json({ error: quizError.message }, { status: 500 });
    }

    if (!quizzes || quizzes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // For mine filter, add question count to each quiz for frontend warning logic
    if (filter === "mine" && quizzes && quizzes.length > 0) {
      const quizIds = quizzes.map((quiz: any) => quiz.id);
      const { data: questionCounts, error: questionError } = await supabase
        .from("community_quiz_question")
        .select("quiz_id")
        .in("quiz_id", quizIds);

      if (!questionError && questionCounts) {
        // Add question count to each quiz
        quizzes = quizzes.map((quiz: any) => ({
          ...quiz,
          question_count: questionCounts.filter((q: any) => q.quiz_id === quiz.id).length
        }));
      }
    }

    // 获取所有作者的ID
    const authorIds = [...new Set(quizzes.map((quiz: any) => quiz.author_id))];

    // 获取作者信息
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", authorIds);

    if (profileError) {
      console.warn("Failed to fetch author profiles:", profileError);
    }

    // 将作者信息合并到quiz数据中，并格式化subject/grade数据
    const quizzesWithAuthors = quizzes.map((quiz: any) => {
      const author = profiles?.find((profile: any) => profile.user_id === quiz.author_id);
      
      // Handle the case where Supabase returns arrays for foreign key relationships
      const subjectData = Array.isArray(quiz.subject) 
        ? quiz.subject[0] 
        : quiz.subject;
      const gradeData = Array.isArray(quiz.grade) 
        ? quiz.grade[0] 
        : quiz.grade;
        
      return {
        ...quiz,
        author: author ? {
          display_name: author.display_name,
          avatar_url: author.avatar_url
        } : null,
        // Ensure subject and grade include the code field
        subject: subjectData ? {
          id: subjectData.id,
          code: subjectData.code,
          translations: subjectData.translations
        } : null,
        grade: gradeData ? {
          id: gradeData.id,
          code: gradeData.code,
          translations: gradeData.translations
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
    const authResult = await authorize(["student", "tutor"]);
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
      max_attempts = 1, 
      visibility = 'public',
      subject_id = null,
      grade_id = null
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
          max_attempts,
          visibility,
          author_id: userId, // 关键：记录是谁创建的
          subject_id,
          grade_id
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
