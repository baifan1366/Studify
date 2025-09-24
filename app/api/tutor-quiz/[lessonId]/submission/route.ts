import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const { lessonId } = await params;
    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    // Fetch all quiz submission
    const { data: questions, error: questionsError } = await supabase
      .from('course_quiz_submission')
      .select('*')
      .eq("lesson_id", lessonId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quiz questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(questions);

  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
