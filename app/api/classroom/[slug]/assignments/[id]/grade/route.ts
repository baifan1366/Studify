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

    console.log('POST Grade - Starting request:', { slug, assignmentId });

    // Authorize user (will check classroom-specific permissions later)
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      console.log('POST Grade - Authorization failed');
      return authResult;
    }
    const { sub: userId } = authResult;
    const supabase = await createAdminClient();

    console.log('POST Grade - Auth successful, userId:', userId);

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    console.log('POST Grade - Profile lookup:', { userId, profile, profileError });

    if (profileError || !profile) {
      console.log('POST Grade - Profile not found:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has permission to grade in this classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    console.log('Classroom query result:', { classroom, classroomError, profileId: profile.id, slug });

    if (classroomError || !classroom) {
      console.log('Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 403 });
    }

    const userRole = classroom.classroom_member[0]?.role;
    if (!userRole || !['owner', 'tutor'].includes(userRole)) {
      console.log('Insufficient permissions. User role:', userRole);
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
            display_name,
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
            display_name,
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

    console.log('GET Grade - Starting request:', { slug, assignmentId });

    // Authorize user (students can see their own grades, tutors can see all)
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      console.log('GET Grade - Authorization failed');
      return authResult;
    }
    const { sub: userId } = authResult;
    const supabase = await createAdminClient();

    console.log('GET Grade - Auth successful, userId:', userId);

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    console.log('GET Grade - Profile lookup:', { userId, profile, profileError });

    if (profileError || !profile) {
      console.log('GET Grade - Profile not found:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user has access to this classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    console.log('GET Grade - Classroom query:', { classroom, classroomError, profileId: profile.id, slug });

    if (classroomError || !classroom) {
      console.log('GET Grade - Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    const userRole = classroom.classroom_member[0]?.role;
    const isOwnerOrTutor = ['owner', 'tutor'].includes(userRole);
    
    console.log('GET Grade - User role in classroom:', { userRole, isOwnerOrTutor });

    // Verify assignment belongs to this classroom
    const { data: assignment, error: assignmentError } = await supabase
      .from('classroom_assignment')
      .select('id, classroom_id')
      .eq('id', assignmentId)
      .eq('classroom_id', classroom.id)
      .single();

    console.log('Assignment verification:', { assignment, assignmentError, assignmentId, classroomId: classroom.id });

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

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
          display_name,
          avatar_url
        ),
        grader:profiles!classroom_grade_grader_id_fkey(
          id,
          display_name
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

    // Authorize user (will check classroom-specific permissions later)
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { sub: userId } = authResult;
    const supabase = await createAdminClient();

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
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (classroomError || !classroom) {
      console.log('Classroom not found for delete grade:', classroomError);
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 403 });
    }

    const userRole = classroom.classroom_member[0]?.role;
    if (!userRole || !['owner', 'tutor'].includes(userRole)) {
      console.log('Insufficient permissions for delete grade. User role:', userRole);
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
