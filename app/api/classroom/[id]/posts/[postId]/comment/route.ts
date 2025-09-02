import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 创建帖子评论
 * @param request 请求对象
 * @param params 路由参数，包含课程ID和帖子ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    // 创建服务端Supabase客户端
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取课程ID和帖子ID
    const classroomId = params.id;
    const postId = params.postId;

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

    // 检查帖子是否存在且属于该课程
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('classroom_id', classroomId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found or does not belong to this classroom' },
        { status: 404 }
      );
    }

    // 获取请求体
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    // 创建评论
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      .select()
      .single();

    if (commentError) {
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating post comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}