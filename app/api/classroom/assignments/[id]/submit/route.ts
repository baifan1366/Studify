import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 提交作业
 * POST /api/classroom/assignments/:id/submit
 * Body: { answer: string, fileUrl?: string }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const assignmentId = params.id;
  
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  // 验证用户是否已登录
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // 解析请求体
    const { answer, fileUrl } = await request.json();
    
    if (!answer && !fileUrl) {
      return NextResponse.json({ error: 'Answer or file is required' }, { status: 400 });
    }
    
    // 检查作业是否存在
    const { data: assignment, error: assignmentError } = await supabase
      .from('assessment.assignment')
      .select('id')
      .eq('id', assignmentId)
      .eq('is_deleted', false)
      .single();
    
    if (assignmentError || !assignment) {
      console.error('Error fetching assignment:', assignmentError);
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    // 创建提交记录
    const { data: submission, error: submissionError } = await supabase
      .from('assessment.submission')
      .insert({
        assignment_id: assignmentId,
        user_id: userId,
        text_content: answer || null,
        content_url: fileUrl || null,
        is_deleted: false
      })
      .select('id')
      .single();
    
    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return NextResponse.json({ error: 'Failed to submit assignment' }, { status: 500 });
    }
    
    // 触发AI自动批改（异步）
    // 这里可以使用队列系统如QStash来处理异步任务
    // 为了简化，我们直接调用自动批改API
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/classroom/assignments/${assignmentId}/autograde`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionId: submission.id,
        internal_key: process.env.INTERNAL_API_KEY // 内部API密钥，防止外部直接调用
      }),
    }).catch(error => {
      console.error('Error triggering autograde:', error);
      // 不阻塞响应，异步处理错误
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        message: 'Assignment submitted successfully'
      }
    });
  } catch (error) {
    console.error('Error processing assignment submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}