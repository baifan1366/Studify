import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Classroom Quizzes API
 * GET /api/classroom/[slug]/quizzes - Get all quizzes for classroom
 * POST /api/classroom/[slug]/quizzes - Create new quiz (tutor/owner only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'upcoming', 'ongoing', 'completed'
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get classroom and verify access
    const { data: classroom } = await supabase
      .from('classrooms')
      .select(`
        id,
        classroom_members!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_members.user_id', session.user.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('quizzes')
      .select(`
        *,
        quiz_attempts(
          id,
          submitted_at,
          score,
          status
        )
      `)
      .eq('classroom_id', classroom.id)
      .eq('quiz_attempts.user_id', session.user.id);

    // Apply status filter
    const now = new Date().toISOString();
    if (status === 'upcoming') {
      query = query.gt('starts_at', now);
    } else if (status === 'ongoing') {
      query = query.lte('starts_at', now).gt('ends_at', now);
    } else if (status === 'completed') {
      query = query.lt('ends_at', now);
    }

    const { data: quizzes, error } = await query
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to include attempt status
    const transformedQuizzes = quizzes?.map(quiz => ({
      ...quiz,
      user_attempt: quiz.quiz_attempts?.[0] || null,
      quiz_attempts: undefined
    })) || [];

    return NextResponse.json({
      quizzes: transformedQuizzes,
      pagination: {
        limit,
        offset,
        has_more: quizzes?.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, questions, starts_at, ends_at, time_limit, settings } = body;

    // Verify user is owner or tutor
    const { data: classroom } = await supabase
      .from('classrooms')
      .select(`
        id,
        classroom_members!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_members.user_id', session.user.id)
      .single();

    if (!classroom || !['owner', 'tutor'].includes(classroom.classroom_members[0]?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        classroom_id: classroom.id,
        title,
        description,
        questions,
        starts_at,
        ends_at,
        time_limit,
        settings,
        created_by: session.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
