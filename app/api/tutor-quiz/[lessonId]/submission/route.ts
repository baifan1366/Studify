import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    console.log('[TutorQuiz] Starting quiz submissions fetch request');
    
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log('[TutorQuiz] Authorization failed');
      return authResult;
    }
    
    const supabase = await createClient();
    const { lessonId } = await params;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    if (!user) {
      console.log('[TutorQuiz] No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TutorQuiz] User authenticated:', user.id, 'for lesson submissions:', lessonId);

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

    // Verify lesson ownership before fetching submissions
    const { data: lessonCheck } = await supabase
      .from('course_lesson')
      .select(`
        id,
        course!inner(
          id,
          owner_id
        )
      `)
      .eq('id', lessonId)
      .eq('course.owner_id', profileId)
      .single();

    if (!lessonCheck) {
      console.log('[TutorQuiz] Lesson not found or access denied');
      return NextResponse.json(
        { error: 'Lesson not found or access denied' },
        { status: 403 }
      );
    }

    // Fetch all quiz submissions for the owned lesson
    const { data: submissions, error: submissionsError } = await supabase
      .from('course_quiz_submission')
      .select(`
        *,
        profiles!inner(
          id,
          full_name,
          display_name
        )
      `)
      .eq("lesson_id", lessonId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (submissionsError) {
      console.error('[TutorQuiz] Database error fetching submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch quiz submissions: ' + submissionsError.message },
        { status: 500 }
      );
    }

    console.log('[TutorQuiz] Successfully fetched', submissions?.length || 0, 'quiz submissions');
    return NextResponse.json(submissions || []);

  } catch (error) {
    console.error('[TutorQuiz] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
