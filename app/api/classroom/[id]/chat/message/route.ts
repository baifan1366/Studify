import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 发送课程聊天消息
 * @param request 请求对象
 * @param params 路由参数，包含课程ID
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    const supabase = await createServerClient();

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取课程ID
    const classroomId = params.id;

    // 检查用户是否有权限访问该课程
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_members')
      .select('role')
      .eq('classroom_id', classroomId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have access to this classroom' },
        { status: 403 }
      );
    }

    // 获取请求体
    const { content } = await request.json();

    // 验证消息内容
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    // 创建新消息
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        classroom_id: classroomId,
        user_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // 获取消息作者信息
    const { data: authorData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // 格式化消息数据
    const formattedMessage = {
      id: message.id,
      content: message.content,
      authorId: user.id,
      authorName: authorData?.full_name || user.email?.split('@')[0] || 'Unknown User',
      authorRole: membership.role,
      createdAt: message.created_at,
    };

    return NextResponse.json(formattedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}