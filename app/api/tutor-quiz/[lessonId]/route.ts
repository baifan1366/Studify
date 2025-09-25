import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from '@/utils/auth/server-guard';

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    console.log('[TutorQuiz] Starting lesson-specific quiz fetch request');
    
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log('[TutorQuiz] Authorization failed');
      return authResult;
    }
    
    const supabase = await createClient();
    const { lessonId } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[TutorQuiz] No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TutorQuiz] User authenticated:', user.id, 'for lesson:', lessonId);

    // Get user's profile ID first
    const { data: profile, error: profileError } = await supabase
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

    // Verify lesson ownership and fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from('course_quiz_question')
      .select(`
        *,
        course_lesson!inner(
          id,
          title,
          course!inner(
            id,
            title,
            tutor_id
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('course_lesson.course.tutor_id', profileId)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

    if (questionsError) {
      console.error('[TutorQuiz] Database error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch quiz questions: ' + questionsError.message },
        { status: 500 }
      );
    }

    console.log('[TutorQuiz] Successfully fetched', questions?.length || 0, 'quiz questions for lesson', lessonId);
    return NextResponse.json(questions || []);

  } catch (error) {
    console.error('[TutorQuiz] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
    try {
        console.log('[TutorQuiz] Starting quiz creation request');
        
        const authResult = await authorize('tutor');
        if (authResult instanceof NextResponse) {
            console.log('[TutorQuiz] Authorization failed');
            return authResult;
        }
        
        const supabase = await createClient();
        const { lessonId } = await params;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('[TutorQuiz] No authenticated user found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[TutorQuiz] User authenticated:', user.id, 'creating quiz for lesson:', lessonId);

        // Get user's profile ID
        const { data: profile, error: profileError } = await supabase
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
        const body = await req.json();
    
        if (!body.lesson_id) {
            return NextResponse.json({ error: "lesson_id is required" }, { status: 422 });
        }
        
        // Verify lesson ownership before creating quiz
        const { data: lesson, error: lessonError } = await supabase
            .from('course_lesson')
            .select(`
                id,
                course!inner(
                    id,
                    tutor_id
                )
            `)
            .eq('id', lessonId)
            .eq('course.tutor_id', profileId)
            .single();
        
        if (lessonError || !lesson) {
            console.error('[TutorQuiz] Lesson ownership verification failed:', lessonError);
            return NextResponse.json(
                { error: 'Lesson not found or access denied' },
                { status: 403 }
            );
        }
  
        const payload = {
            question_text: body.question_text,
            question_type: body.question_type,
            options: body.options,
            correct_answer: body.correct_answer,
            explanation: body.explanation,
            points: body.points,
            difficulty: body.difficulty,
            position: body.position,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            lesson_id: lessonId,
        };
    
        if (!payload.question_text) {
            return NextResponse.json({ error: "question_text is required" }, { status: 422 });
        }
    
        if (!payload.question_type) {
            return NextResponse.json({ error: "question_type is required" }, { status: 422 });
        }
    
        const { data, error } = await supabase
            .from("course_quiz_question")
            .insert([payload])
            .select("*")
            .single();
    
        if (error) {
            console.error('[TutorQuiz] Failed to create quiz question:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        
        console.log('[TutorQuiz] Successfully created quiz question:', data.id);
        return NextResponse.json({ data }, { status: 201 });
    } catch (e: any) {
        console.error('[TutorQuiz] Unexpected error in POST:', e);
        return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
    }
}