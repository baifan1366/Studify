import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Assignment Mistakes API
 * GET /api/classroom/[slug]/assignments/mistakes - Get assignment mistakes for classroom
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
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
      .eq('classroom_members.user_id', user.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Build mistakes query
    let query = supabase
      .from('assignment_mistakes')
      .select(`
        id,
        user_id,
        assignment_id,
        submission_id,
        question_id,
        mistake_content,
        analysis,
        knowledge_points,
        recommended_exercises,
        created_at,
        assignment:assignments(
          id,
          title,
          classroom_id
        )
      `)
      .eq('assignment.classroom_id', classroom.id);

    // Filter by user if specified and user has permission
    if (userId) {
      const userRole = classroom.classroom_members[0]?.role;
      if (userRole === 'student' && userId !== user.id) {
        return NextResponse.json({ error: 'Students can only view their own mistakes' }, { status: 403 });
      }
      query = query.eq('user_id', userId);
    } else {
      // If no userId specified, show current user's mistakes for students
      const userRole = classroom.classroom_members[0]?.role;
      if (userRole === 'student') {
        query = query.eq('user_id', user.id);
      }
    }

    const { data: mistakes, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mistakes: mistakes || [],
      meta: {
        total: mistakes?.length || 0,
        user_role: classroom.classroom_members[0]?.role
      }
    });
  } catch (error) {
    console.error('Error fetching assignment mistakes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
