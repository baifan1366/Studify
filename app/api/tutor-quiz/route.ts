import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    console.log('[TutorQuiz] Starting quiz fetch request');
    
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log('[TutorQuiz] Authorization failed');
      return authResult;
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[TutorQuiz] No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TutorQuiz] User authenticated:', user.id);

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

    // Fetch quiz questions through course ownership
    // Join with course_lesson and course to ensure user owns the courses
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

    console.log('[TutorQuiz] Successfully fetched', questions?.length || 0, 'quiz questions');
    return NextResponse.json(questions || []);

  } catch (error) {
    console.error('[TutorQuiz] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
