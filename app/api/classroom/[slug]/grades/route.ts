import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Authorize user
    const authResult = await authorize('student');
    if ('error' in authResult) {
      return authResult;
    }
    
    const userId = authResult.sub;
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

    // Verify user has access to this classroom
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        name,
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

    // Parse query parameters
    const url = new URL(request.url);
    const assignmentId = url.searchParams.get('assignment_id');
    const studentId = url.searchParams.get('student_id');

    // Build base query
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
        classroom_assignment!classroom_grade_assignment_id_fkey(
          id,
          title,
          due_date
        ),
        student:profiles!classroom_grade_user_id_fkey(
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
      .eq('is_deleted', false);

    // Join with assignments to filter by classroom
    query = query.eq('classroom_assignment.classroom_id', classroom.id);

    // Apply filters
    if (assignmentId) {
      query = query.eq('assignment_id', parseInt(assignmentId));
    }

    if (studentId) {
      query = query.eq('user_id', parseInt(studentId));
    }

    // If student, only show their own grades
    if (!isOwnerOrTutor) {
      query = query.eq('user_id', profile.id);
    }

    const { data: grades, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate statistics for tutors
    let statistics = null;
    if (isOwnerOrTutor) {
      const totalGrades = grades.length;
      const averageScore = totalGrades > 0 
        ? grades.reduce((sum: number, grade: any) => sum + grade.score, 0) / totalGrades
        : 0;
      
      const gradeDist = grades.reduce((acc: Record<string, number>, grade: any) => {
        const range = grade.score >= 90 ? 'A' : 
                     grade.score >= 80 ? 'B' : 
                     grade.score >= 70 ? 'C' : 
                     grade.score >= 60 ? 'D' : 'F';
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      statistics = {
        total_grades: totalGrades,
        average_score: Math.round(averageScore * 100) / 100,
        grade_distribution: gradeDist,
        highest_score: totalGrades > 0 ? Math.max(...grades.map((g: any) => g.score)) : 0,
        lowest_score: totalGrades > 0 ? Math.min(...grades.map((g: any) => g.score)) : 0
      };
    }

    return NextResponse.json({ 
      grades,
      statistics,
      classroom: {
        id: classroom.id,
        name: classroom.name
      }
    });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bulk grade assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Authorize tutor or owner
    const authResult = await authorize('tutor');
    if ('error' in authResult) {
      return authResult;
    }
    
    const userId = authResult.sub;
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

    // Get request body
    const { grades } = await request.json();

    if (!Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({ 
        error: 'grades must be a non-empty array' 
      }, { status: 400 });
    }

    // Validate each grade
    for (const grade of grades) {
      if (!grade.assignment_id || !grade.user_id || grade.score === undefined) {
        return NextResponse.json({ 
          error: 'Each grade must have assignment_id, user_id, and score' 
        }, { status: 400 });
      }

      if (typeof grade.score !== 'number' || grade.score < 0 || grade.score > 100) {
        return NextResponse.json({ 
          error: 'Score must be a number between 0 and 100' 
        }, { status: 400 });
      }
    }

    // Prepare grades for insertion/update
    const processedGrades = grades.map(grade => ({
      assignment_id: grade.assignment_id,
      user_id: grade.user_id,
      grader_id: profile.id,
      score: grade.score,
      feedback: grade.feedback || null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Use upsert to handle both inserts and updates
    const { data: createdGrades, error } = await supabase
      .from('classroom_grade')
      .upsert(processedGrades, {
        onConflict: 'assignment_id,user_id',
        ignoreDuplicates: false
      })
      .select(`
        id,
        public_id,
        assignment_id,
        user_id,
        score,
        feedback,
        created_at,
        updated_at
      `);

    if (error) throw error;

    return NextResponse.json({ 
      message: `Successfully processed ${createdGrades.length} grades`,
      grades: createdGrades
    }, { status: 201 });
  } catch (error) {
    console.error('Error bulk grading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
