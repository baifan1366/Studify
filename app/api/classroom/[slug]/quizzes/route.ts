import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    console.log('🔍 [GET Quizzes] Looking for classroom with slug:', slug);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();

    console.log('📚 [GET Quizzes] Classroom query result:', { classroom, error: classroomError });

    if (!classroom) {
      return NextResponse.json({ 
        error: 'Classroom not found',
        debug: { requestedSlug: slug }
      }, { status: 404 });
    }

    // Get quizzes for this classroom
    const { data: quizzes, error: quizzesError } = await supabase
      .from('classroom_quiz')
      .select(`
        *,
        classroom_quiz_question (
          id,
          points,
          position,
          classroom_question (
            id,
            stem,
            kind,
            choices,
            answer
          )
        )
      `)
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (quizzesError) {
      console.error('Error fetching quizzes:', quizzesError);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    // Calculate total questions and points for each quiz, and format questions
    const quizzesWithStats = quizzes.map(quiz => {
      // Map database kind to frontend format
      const kindMap: Record<string, string> = {
        'mcq': 'multiple_choice',
        'true_false': 'true_false',
        'short': 'short_answer',
        'essay': 'essay',
        'code': 'code'
      };

      const questions = quiz.classroom_quiz_question?.map((qq: any) => {
        const dbKind = qq.classroom_question?.kind;
        const questionType = kindMap[dbKind] || dbKind;

        return {
          id: qq.classroom_question?.id,
          question_text: qq.classroom_question?.stem,
          question_type: questionType,
          points: parseFloat(qq.points) || 0,
          order_index: qq.position || 0,
          options: qq.classroom_question?.choices || undefined,
          correct_answer: qq.classroom_question?.answer || undefined
        };
      }).sort((a: any, b: any) => a.order_index - b.order_index) || [];

      return {
        ...quiz,
        total_questions: questions.length,
        total_points: questions.reduce((sum: number, q: any) => sum + q.points, 0),
        questions
      };
    });

    return NextResponse.json({ quizzes: quizzesWithStats });
  } catch (error: any) {
    console.error('Error in GET /api/classroom/[slug]/quizzes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;
    const body = await request.json();

    console.log('🔍 [POST Quiz] Looking for classroom with slug:', slug);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    console.log('📚 [POST Quiz] Classroom query result:', { classroom, error: classroomError });

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Create quiz - don't set slug as it has a foreign key constraint issue
    const { data: quiz, error: quizError } = await supabase
      .from('classroom_quiz')
      .insert({
        classroom_id: classroom.id,
        title: body.title,
        settings: body.settings || {
          shuffle: true,
          time_limit: body.time_limit || null,
          allow_multiple_attempts: body.allow_multiple_attempts || false,
          due_date: body.due_date || null
        }
      })
      .select()
      .single();

    console.log('📝 [POST Quiz] Quiz creation result:', { quiz, error: quizError });

    if (quizError) {
      console.error('Error creating quiz:', quizError);
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/classroom/[slug]/quizzes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
