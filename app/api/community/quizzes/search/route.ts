import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { 
  parseSearchQueryParams, 
  validateSearchParams, 
  getSearchVectorColumn, 
  buildTsQuery,
  DEFAULT_SEARCH_PARAMS,
  getTextSearchConfig,
  sanitizeSearchQuery
} from "@/utils/quiz/search-utils";

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
    console.error("Error fetching question counts for search:", error);
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
      visibility = 'public',
      limit = DEFAULT_SEARCH_PARAMS.limit,
      offset = DEFAULT_SEARCH_PARAMS.offset,
      sort = DEFAULT_SEARCH_PARAMS.sort,
      order = DEFAULT_SEARCH_PARAMS.order
    } = searchQuery;

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Build the search query (plain text for Supabase textSearch)
    const plainQuery = sanitizeSearchQuery(query);
    if (!plainQuery) {
      return NextResponse.json([], { status: 200 });
    }

    let queryBuilder = supabase
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
        subject_id,
        grade_id,
        created_at,
        community_quiz_subject!subject_id(
          id,
          code,
          translations
        ),
        community_quiz_grade!grade_id(
          id,
          code,
          translations
        )
      `)
      .eq("visibility", visibility)
      .eq("is_deleted", false);

    // Apply full-text search using the appropriate config
    const searchColumn = getSearchVectorColumn(locale);
    const config = getTextSearchConfig(locale);
    queryBuilder = queryBuilder.textSearch(searchColumn, plainQuery, { config, type: 'plain' });

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

    // Apply sorting
    if (sort === 'created_at') {
      queryBuilder = queryBuilder.order("created_at", { ascending: order === 'asc' });
    } else {
      // For relevance sorting, PostgreSQL automatically sorts by relevance for text search
      // Add secondary sort by created_at
      queryBuilder = queryBuilder.order("created_at", { ascending: false });
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data: quizzes, error: quizError } = await queryBuilder;

    if (quizError) {
      return NextResponse.json({ error: quizError.message }, { status: 500 });
    }

    if (!quizzes || quizzes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Filter out quizzes with no questions for public search results
    const filteredQuizzes = await filterQuizzesWithQuestions(supabase, quizzes);
    
    if (filteredQuizzes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Get author information
    const authorIds = [...new Set(filteredQuizzes.map(quiz => quiz.author_id))];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", authorIds);

    if (profileError) {
      console.warn("Failed to fetch author profiles:", profileError);
    }

    // Format the response
    const quizzesWithAuthors = filteredQuizzes.map((quiz: any) => {
      const author = profiles?.find(profile => profile.user_id === quiz.author_id);
      return {
        ...quiz,
        author: author ? {
          display_name: author.display_name,
          avatar_url: author.avatar_url
        } : null,
        subject: quiz.community_quiz_subject || null,
        grade: quiz.community_quiz_grade || null,
        // Remove the nested objects to clean up the response
        community_quiz_subject: undefined,
        community_quiz_grade: undefined
      };
    });

    return NextResponse.json(quizzesWithAuthors, { status: 200 });
  } catch (err: any) {
    console.error("Search quizzes error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
