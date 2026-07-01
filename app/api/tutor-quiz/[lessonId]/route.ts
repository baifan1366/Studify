import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/server";
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
            owner_id
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .eq('course_lesson.course.owner_id', profileId)
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
        
        const supabase = await createAdminClient();
        const { lessonId } = await params;
        const user = authResult.user;

        console.log('[TutorQuiz] User authenticated:', user.id, 'creating quiz for lesson:', lessonId);

        const profileId = authResult.user.profile?.id;
        if (!profileId) {
            return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
        }
        const body = await req.json();
    
        if (body.lesson_id != null && String(body.lesson_id) !== String(lessonId)) {
            return NextResponse.json({ error: "lesson_id does not match the request URL" }, { status: 422 });
        }
        
        // Fetch the lesson first, then perform an explicit ownership check. Filtering
        // ownership inside the embedded relation can turn an existing lesson into zero
        // rows under RLS and results in PGRST116 when `.single()` is used.
        const { data: lesson, error: lessonError } = await supabase
            .from('course_lesson')
            .select(`
                id,
                course:course_id(
                    id,
                    owner_id
                )
            `)
            .eq('id', lessonId)
            .eq('is_deleted', false)
            .maybeSingle();
        
        if (lessonError) {
            console.error('[TutorQuiz] Lesson ownership verification failed:', lessonError);
            return NextResponse.json({ error: 'Failed to verify lesson ownership' }, { status: 500 });
        }

        if (!lesson) {
            return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
        }

        const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
        if (!course || Number(course.owner_id) !== Number(profileId)) {
            return NextResponse.json(
                { error: 'You do not have permission to add quiz questions to this lesson' },
                { status: 403 }
            );
        }
  
        const payload = {
            user_id: profileId,
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
