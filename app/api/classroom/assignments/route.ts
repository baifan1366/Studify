import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 获取作业列表
 * GET /api/classroom/assignments?state=upcoming|incomplete|submitted
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'upcoming';
  
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  // 验证用户是否已登录
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    let query = supabase
      .from('assessment.assignment')
      .select(`
        id,
        title,
        course:course_id (id, title),
        description,
        due_at,
        submission:assessment.submission!inner(id, user_id)
      `)
      .eq('submission.user_id', userId)
      .eq('is_deleted', false);
    
    const now = new Date().toISOString();
    
    // 根据状态筛选
    switch (state) {
      case 'upcoming':
        // due_on > now() 且未提交
        query = query
          .gt('due_at', now)
          .is('submission.id', null);
        break;
      case 'incomplete':
        // due_on < now() 且未提交
        query = query
          .lt('due_at', now)
          .is('submission.id', null);
        break;
      case 'submitted':
        // 已提交
        query = query
          .not('submission.id', 'is', null);
        break;
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data.map(item => ({
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