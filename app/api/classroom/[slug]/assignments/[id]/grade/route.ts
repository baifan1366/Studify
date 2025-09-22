import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const assignmentId = parseInt(id);

    // Authorize tutor or owner
    const { userId } = await authorize('tutor');
    const supabase = createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has permission to grade in this classroom
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom || !['owner', 'tutor'].includes(classroom.classroom_member[0]?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify assignment belongs to this classroom
    const { data: assignment, error: assignmentError } = await supabase
      .from('classroom_assignment')
      .select('id, classroom_id')
      .eq('id', assignmentId)
      .eq('classroom_id', classroom.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get request body
    const { student_id, score, feedback } = await request.json();

    if (!student_id || score === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: student_id, score' 
      }, { status: 400 });
    }

    // Validate score
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json({ 
        error: 'Score must be a number between 0 and 100' 
      }, { status: 400 });
    }

    // Check if grade already exists
    const { data: existingGrade } = await supabase
      .from('classroom_grade')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('user_id', student_id)
      .eq('is_deleted', false)
      .single();

    if (existingGrade) {
      // Update existing grade
      const { data: grade, error: updateError } = await supabase
        .from('classroom_grade')
        .update({
          score,
          feedback: feedback || null,
          grader_id: profile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingGrade.id)
        .select(`
          id,
          public_id,
          assignment_id,
          user_id,
          grader_id,
          score,
          feedback,
          created_at,
          updated_at,
          profiles!classroom_grade_user_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ grade });
    } else {
      // Create new grade
      const { data: grade, error: createError } = await supabase
        .from('classroom_grade')
        .insert({
          assignment_id: assignmentId,
          user_id: student_id,
          grader_id: profile.id,
          score,
          feedback: feedback || null,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          id,
          public_id,
          assignment_id,
          user_id,
          grader_id,
          score,
          feedback,
          created_at,
          updated_at,
          profiles!classroom_grade_user_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (createError) throw createError;
      return NextResponse.json({ grade }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating grade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const assignmentId = parseInt(id);

    // Authorize user (students can see their own grades, tutors can see all)
    const { userId } = await authorize('student');
    const supabase = createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has access to this classroom
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    const userRole = classroom.classroom_member[0]?.role;
    const isOwnerOrTutor = ['owner', 'tutor'].includes(userRole);

    // Build query based on user role
    let query = supabase
      .from('classroom_grade')
      .select(`
        id,
        public_id,
        assignment_id,
        user_id,
        grader_id,
        score,
        feedback,
        created_at,
        updated_at,
        profiles!classroom_grade_user_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        grader:profiles!classroom_grade_grader_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('assignment_id', assignmentId)
      .eq('is_deleted', false);

    // If student, only show their own grade
    if (!isOwnerOrTutor) {
      query = query.eq('user_id', profile.id);
    }

    const { data: grades, error } = await query;

    if (error) throw error;

    return NextResponse.json({ grades });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const assignmentId = parseInt(id);

    // Authorize tutor or owner
    const { userId } = await authorize('tutor');
    const supabase = createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has permission to delete grades in this classroom
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom || !['owner', 'tutor'].includes(classroom.classroom_member[0]?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get student_id from query params
    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
    }

    // Soft delete the grade
    const { error } = await supabase
      .from('classroom_grade')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('assignment_id', assignmentId)
      .eq('user_id', parseInt(studentId))
      .eq('is_deleted', false);

    if (error) throw error;

    return NextResponse.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
