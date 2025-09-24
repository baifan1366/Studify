import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch quiz questions for the lesson using the actual lesson ID (not public_id)
    const { data: questions, error: questionsError } = await supabase
      .from('course_quiz_question')
      .select('*')
      .eq("user_id", userId)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

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
