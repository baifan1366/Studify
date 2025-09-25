import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from '@/utils/auth/server-guard';

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string, quizId: string }> }) {
  try {
    console.log('[TutorQuiz] Starting specific quiz fetch request');
    
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log('[TutorQuiz] Authorization failed');
      return authResult;
    }
    
    const client = await createServerClient();
    const { lessonId, quizId } = await params;
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      console.log('[TutorQuiz] No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TutorQuiz] User authenticated:', user.id, 'for lesson:', lessonId, 'quiz:', quizId);

    // Get user's profile ID first
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[TutorQuiz] Failed to fetch user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    const profileId = profile.id;
    console.log('[TutorQuiz] User profile ID:', profileId);

    // Verify lesson ownership and fetch specific quiz question
    const { data: question, error: questionError } = await client
      .from('course_quiz_question')
      .select(`
        *,
        course_lesson!inner(
          id,
          title,
          course!inner(
            id,
            title,
            owner_id
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('public_id', quizId)
      .eq('course_lesson.course.owner_id', profileId)
      .eq('is_deleted', false)
      .single();

    if (questionError) {
      console.error('[TutorQuiz] Database error fetching question:', questionError);
      return NextResponse.json(
        { error: 'Failed to fetch quiz question: ' + questionError.message },
        { status: 500 }
      );
    }

    console.log('[TutorQuiz] Successfully fetched quiz question:', question?.id);
    return NextResponse.json(question);

  } catch (error) {
    console.error('[TutorQuiz] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string, quizId: string }> }) {
  try {
    console.log('[TutorQuiz] Starting quiz update request');
    
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log('[TutorQuiz] Authorization failed');
      return authResult;
    }

    const body = await req.json();
    const client = await createServerClient();
    const { lessonId, quizId } = await params;
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      console.log('[TutorQuiz] No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile ID first
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[TutorQuiz] Failed to fetch user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    const profileId = profile.id;

    // Verify ownership before updating
    const { data: existingQuestion } = await client
      .from('course_quiz_question')
      .select(`
        id,
        course_lesson!inner(
          course!inner(
            owner_id
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('public_id', quizId)
      .eq('course_lesson.course.owner_id', profileId)
      .eq('is_deleted', false)
      .single();

    if (!existingQuestion) {
      console.log('[TutorQuiz] Question not found or access denied');
      return NextResponse.json(
        { error: 'Question not found or access denied' },
        { status: 403 }
      );
    }

    const updates = {
      question_text: body.question_text,
      question_type: body.question_type,
      options: body.options,
      correct_answer: body.correct_answer,
      explanation: body.explanation,
      points: body.points,
      difficulty: body.difficulty,
      position: body.position,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course_quiz_question")
      .update(updates)
      .eq("lesson_id", lessonId)
      .eq("public_id", quizId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) {
      console.error('[TutorQuiz] Failed to update quiz question:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[TutorQuiz] Successfully updated quiz question:', data?.id);
    return NextResponse.json({ data });
  } catch (e: any) {
    console.error('[TutorQuiz] Unexpected error in PATCH:', e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ lessonId: string, quizId: string }> }) {
  try {
    console.log('[TutorQuiz] Starting quiz deletion request');
    
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log('[TutorQuiz] Authorization failed');
      return authResult;
    }

    const client = await createServerClient();
    const { lessonId, quizId } = await params;
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      console.log('[TutorQuiz] No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile ID first
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[TutorQuiz] Failed to fetch user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    const profileId = profile.id;

    // Verify ownership before deleting
    const { data: existingQuestion } = await client
      .from('course_quiz_question')
      .select(`
        id,
        course_lesson!inner(
          course!inner(
            owner_id
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('public_id', quizId)
      .eq('course_lesson.course.owner_id', profileId)
      .eq('is_deleted', false)
      .single();

    if (!existingQuestion) {
      console.log('[TutorQuiz] Question not found or access denied');
      return NextResponse.json(
        { error: 'Question not found or access denied' },
        { status: 403 }
      );
    }
    
    const { error } = await client
      .from("course_quiz_question")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("lesson_id", lessonId)
      .eq("public_id", quizId);

    if (error) {
      console.error('[TutorQuiz] Failed to delete quiz question:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[TutorQuiz] Successfully deleted quiz question');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[TutorQuiz] Unexpected error in DELETE:', e);
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
