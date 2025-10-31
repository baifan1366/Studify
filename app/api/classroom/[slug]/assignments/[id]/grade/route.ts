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
    const authResult = await authorize(['student', 'tutor']);
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
      .select('id')
      .eq('slug', slug)
      .single();

    console.log('Classroom query result:', { classroom, classroomError, slug });

    if (classroomError || !classroom) {
      console.log('Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 403 });
    }

    // Check user's role in the classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    console.log('Membership query result:', { membership, membershipError, classroomId: classroom.id, profileId: profile.id });

    if (membershipError || !membership) {
      console.log('User is not a member of this classroom');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userRole = membership.role;
    if (!['owner', 'tutor'].includes(userRole)) {
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

    console.log('POST Grade - Request body:', { student_id, score, feedback, student_id_type: typeof student_id });

    if (!student_id || score === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: student_id, score' 
      }, { status: 400 });
    }

    // Convert student_id to integer
    const studentProfileId = parseInt(String(student_id));
    if (isNaN(studentProfileId)) {
      return NextResponse.json({ 
        error: 'Invalid student_id format' 
      }, { status: 400 });
    }

    // Validate score
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json({ 
        error: 'Score must be a number between 0 and 100' 
      }, { status: 400 });
    }

    // Get student's user_id (UUID from users table)
    const { data: studentProfile, error: studentProfileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', studentProfileId)
      .single();

    if (studentProfileError || !studentProfile) {
      console.log('POST Grade - Student profile not found:', studentProfileError);
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    console.log('POST Grade - Validated data:', { 
      studentProfileId, 
      studentUserId: studentProfile.user_id,
      graderUserId: userId, // This is already the user_id from auth
      score, 
      assignmentId 
    });

    // Check if grade already exists (use user_id from users table)
    const { data: existingGrade, error: existingGradeError } = await supabase
      .from('classroom_grade')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('user_id', studentProfile.user_id) // UUID from users table
      .eq('is_deleted', false)
      .single();

    console.log('POST Grade - Existing grade check:', { existingGrade, existingGradeError });

    if (existingGrade) {
      // Update existing grade
      const { data: grade, error: updateError } = await supabase
        .from('classroom_grade')
        .update({
          score,
          feedback: feedback || null,
          grader_id: userId // UUID from users table (from auth)
        })
        .eq('id', existingGrade.id)
        .select('id, assignment_id, user_id, grader_id, score, feedback, created_at, updated_at')
        .single();

      if (updateError) throw updateError;

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', [grade.user_id, grade.grader_id].filter(Boolean));

      const gradeWithProfiles = {
        ...grade,
        student: profiles?.find(p => p.id === grade.user_id),
        grader: profiles?.find(p => p.id === grade.grader_id)
      };

      return NextResponse.json({ grade: gradeWithProfiles });
    } else {
      // Create new grade
      console.log('POST Grade - Creating new grade with data:', {
        assignment_id: assignmentId,
        user_id: studentProfileId,
        grader_id: profile.id,
        score,
        types: {
          assignment_id: typeof assignmentId,
          user_id: typeof studentProfileId,
          grader_id: typeof profile.id,
          score: typeof score
        }
      });

      // Use user_id (UUID from users table) for both user_id and grader_id
      const insertData = {
        assignment_id: Number(assignmentId),
        user_id: studentProfile.user_id, // UUID from users table
        grader_id: userId, // UUID from users table (from auth)
        score: Number(score),
        feedback: feedback ? String(feedback) : null
      };

      console.log('POST Grade - Insert data:', JSON.stringify(insertData, null, 2));

      const { data: grade, error: createError } = await supabase
        .from('classroom_grade')
        .insert([insertData])
        .select('id, assignment_id, user_id, grader_id, score, feedback, created_at, updated_at')
        .single();

      if (createError) {
        console.error('POST Grade - Create error details:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        throw createError;
      }

      console.log('POST Grade - Grade created successfully:', grade);

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', [grade.user_id, grade.grader_id].filter(Boolean));

      const gradeWithProfiles = {
        ...grade,
        student: profiles?.find(p => p.id === grade.user_id),
        grader: profiles?.find(p => p.id === grade.grader_id)
      };

      return NextResponse.json({ grade: gradeWithProfiles }, { status: 201 });
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
    const authResult = await authorize(['student', 'tutor']);
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
      .select('id')
      .eq('slug', slug)
      .single();

    console.log('GET Grade - Classroom query:', { classroom, classroomError, slug });

    if (classroomError || !classroom) {
      console.log('GET Grade - Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Check user's role in the classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    console.log('GET Grade - Membership query:', { membership, membershipError, classroomId: classroom.id, profileId: profile.id });

    if (membershipError || !membership) {
      console.log('GET Grade - User is not a member of this classroom');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userRole = membership.role;
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
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('is_deleted', false);

    // If student, only show their own grade
    if (!isOwnerOrTutor) {
      query = query.eq('user_id', profile.id);
    }

    const { data: grades, error } = await query;

    if (error) throw error;

    // Fetch user profiles separately to avoid foreign key issues
    if (grades && grades.length > 0) {
      const userIds = [...new Set([
        ...grades.map(g => g.user_id),
        ...grades.map(g => g.grader_id).filter(Boolean)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      // Attach profile data to grades
      const gradesWithProfiles = grades.map(grade => ({
        ...grade,
        student: profiles?.find(p => p.id === grade.user_id),
        grader: profiles?.find(p => p.id === grade.grader_id)
      }));

      return NextResponse.json({ grades: gradesWithProfiles });
    }

    return NextResponse.json({ grades: [] });
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
    const authResult = await authorize(['student', 'tutor']);
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
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      console.log('Classroom not found for delete grade:', classroomError);
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 403 });
    }

    // Check user's role in the classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (membershipError || !membership) {
      console.log('User is not a member of this classroom for delete grade');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userRole = membership.role;
    if (!['owner', 'tutor'].includes(userRole)) {
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
