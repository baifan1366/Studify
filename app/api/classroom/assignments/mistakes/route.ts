import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 获取错题本
 * GET /api/classroom/assignments/mistakes?userId=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('userId');
  
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  // 验证用户是否已登录
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 默认获取当前用户的错题本，如果指定了userId且当前用户是教师，则可以查看该学生的错题本
  const userId = requestedUserId || session.user.id;
  
  // 如果查看其他用户的错题本，需要验证当前用户是否有权限（教师角色）
  if (requestedUserId && requestedUserId !== session.user.id) {
    const { data: userRole } = await supabase
      .from('core.profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();
    
    if (!userRole || userRole.role !== 'teacher') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
  }
  
  try {
    // 获取错题本列表
    const { data: mistakes, error } = await supabase
      .from('classroom.mistake_book')
      .select(`
        id,
        mistake_content,
        analysis,
        knowledge_points,
        recommended_exercises,
        created_at,
        assignment:assignment_id (id, title, course_id),
        submission:submission_id (id, text_content)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching mistakes:', error);
      return NextResponse.json({ error: 'Failed to fetch mistakes' }, { status: 500 });
    }
    
    // 获取相关课程信息
    const courseIds = mistakes
      .filter(m => m.assignment?.course_id)
      .map(m => m.assignment.course_id);
    
    let courses = {};
    if (courseIds.length > 0) {
      const { data: coursesData } = await supabase
        .from('courses.course')
        .select('id, title')
        .in('id', courseIds);
      
      if (coursesData) {
        courses = coursesData.reduce((acc, course) => {
          acc[course.id] = course.title;
          return acc;
        }, {});
      }
    }
    
    // 构建响应数据
    const responseData = mistakes.map(mistake => ({
      id: mistake.id,
      mistake_content: mistake.mistake_content,
      analysis: mistake.analysis,
      knowledge_points: mistake.knowledge_points || [],
      recommended_exercises: mistake.recommended_exercises || {},
      created_at: mistake.created_at,
      assignment: mistake.assignment ? {
        id: mistake.assignment.id,
        title: mistake.assignment.title,
        course: courses[mistake.assignment.course_id] || 'Unknown Course'
      } : null
    }));
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error processing mistakes request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}