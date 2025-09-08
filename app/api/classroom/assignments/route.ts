import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * 获取作业列表
 * GET /api/classroom/assignments?state=upcoming|incomplete|submitted
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'upcoming';
  
const supabase = await createServerClient();
  
  // 验证用户是否已登录
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Get all assignments first
    const { data: assignments, error: assignmentError } = await supabase
      .from('assignment')
      .select(`
        id,
        title,
        course:course_id (id, title),
        description,
        due_at,
        created_at
      `)
      .eq('is_deleted', false);
      
    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
    
    // Get user submissions for these assignments
    const assignmentIds = assignments?.map(a => a.id) || [];
    const { data: submissions } = await supabase
      .from('submission')
      .select('id, assignment_id, user_id')
      .in('assignment_id', assignmentIds)
      .eq('user_id', userId);
    
    const now = new Date().toISOString();
    
    // Create submission lookup map
    const submissionMap = new Map();
    submissions?.forEach(sub => {
      submissionMap.set(sub.assignment_id, sub);
    });
    
    // Filter assignments based on state
    const filteredAssignments = assignments?.filter(assignment => {
      const hasSubmission = submissionMap.has(assignment.id);
      const isOverdue = new Date(assignment.due_at) < new Date();
      
      switch (state) {
        case 'upcoming':
          return !isOverdue && !hasSubmission;
        case 'incomplete':
          return isOverdue && !hasSubmission;
        case 'submitted':
          return hasSubmission;
        default:
          return true;
      }
    }) || [];
    
    return NextResponse.json({
      success: true,
      data: filteredAssignments.map((item: any) => ({
        id: item.id,
        title: item.title,
        course_name: item.course?.title || 'Unknown Course',
        published_on: item.created_at,
        due_on: item.due_at,
        status: state
      }))
    });
  } catch (error) {
    console.error('Error processing assignments request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}