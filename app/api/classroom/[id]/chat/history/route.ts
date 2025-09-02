import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 获取课程聊天历史
 * @param request 请求对象
 * @param params 路由参数，包含课程ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 创建服务端Supabase客户端
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

    // 获取分页参数
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // 获取聊天历史
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles(id, full_name, email),
        classroom_members!inner(role)
      `)
      .eq('classroom_id', classroomId)
      .eq('classroom_members.user_id', 'user_id')
      .eq('classroom_members.classroom_id', classroomId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch chat history' },
        { status: 500 }
      );
    }

    // 格式化消息数据
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      authorId: message.user_id,
      authorName: message.profiles.full_name || message.profiles.email.split('@')[0],
      authorRole: message.classroom_members.role,
      createdAt: message.created_at,
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}