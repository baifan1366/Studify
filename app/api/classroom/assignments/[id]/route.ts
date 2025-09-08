import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * 获取作业详情
 * GET /api/classroom/assignments/:id
 */
export async function GET(request: Request, context: { params: { id: string } }) {
  const { params } = context;
  const assignmentId = params.id;
  
const supabase = await createServerClient();
  
  // 验证用户是否已登录
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // 获取作业详情
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment')
      .select(`
        id,
        title,
        description,
        due_at,
        course_id,
        courses!inner(id, title)
      `)
      .eq('id', assignmentId)
      .eq('is_deleted', false)
      .single();

    // Get assignment attachments separately
    const { data: attachments } = await supabase
      .from('assignment_attachment')
      .select('id, file_url, file_name')
      .eq('assignment_id', assignmentId);

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError);
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    // 获取提交历史
    const { data: submissions, error: submissionsError } = await supabase
      .from('submission')
      .select(`
        id,
        created_at,
        text_content,
        content_url
      `)
      .eq('assignment_id', assignmentId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Get grades for submissions separately
    let submissionsWithGrades: any[] = submissions || [];
    if (submissions && submissions.length > 0) {
      const submissionIds = submissions.map(s => s.id);
      const { data: grades } = await supabase
        .from('grade')
        .select('submission_id, score, feedback, graded_at')
        .in('submission_id', submissionIds);

      submissionsWithGrades = submissions.map(submission => ({
        ...submission,
        grade: grades?.find(g => g.submission_id === submission.id) || null
      }));
    }
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }
    
    // 构建响应数据
    const responseData = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      due_at: assignment.due_at,
      course: assignment.courses[0] || null,
      attachments: attachments || [],
      is_submitted: submissionsWithGrades && submissionsWithGrades.length > 0,
      submissions: submissionsWithGrades || [],
      grading_status: submissionsWithGrades && submissionsWithGrades.length > 0 && submissionsWithGrades[0].grade ? 'graded' : 'pending'
    };
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error processing assignment detail request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}