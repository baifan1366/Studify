import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 获取课程帖子列表
 * @param request 请求对象
 * @param params 路由参数，包含课程ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
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

    // 获取帖子列表
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        attachments,
        user_id,
        profiles(id, full_name, email),
        classroom_members!inner(role)
      `)
      .eq('classroom_id', classroomId)
      .eq('classroom_members.user_id', 'user_id')
      .eq('classroom_members.classroom_id', classroomId)
      .order('created_at', { ascending: false });

    if (postsError) {
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // 获取每个帖子的评论
    const postIds = posts.map(post => post.id);
    const { data: comments, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        created_at,
        post_id,
        user_id,
        profiles(id, full_name, email),
        classroom_members!inner(role)
      `)
      .in('post_id', postIds)
      .eq('classroom_members.user_id', 'user_id')
      .eq('classroom_members.classroom_id', classroomId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // 格式化帖子和评论数据
    const formattedPosts = posts.map(post => {
      const postComments = comments
        .filter(comment => comment.post_id === post.id)
        .map(comment => ({
          id: comment.id,
          content: comment.content,
          authorId: comment.user_id,
          authorName: comment.profiles[0]?.full_name || comment.profiles[0]?.email?.split('@')[0] || 'Unknown',
          authorRole: comment.classroom_members[0]?.role || 'student',
          createdAt: comment.created_at,
        }));

      return {
        id: post.id,
        content: post.content,
        authorId: post.user_id,
        authorName: post.profiles[0]?.full_name || post.profiles[0]?.email?.split('@')[0] || 'Unknown',
        authorRole: post.classroom_members[0]?.role || 'student',
        createdAt: post.created_at,
        attachments: post.attachments || [],
        comments: postComments,
      };
    });

    return NextResponse.json(formattedPosts);
  } catch (error) {
    console.error('Error fetching classroom posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 创建课程帖子
 * @param request 请求对象
 * @param params 路由参数，包含课程ID
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
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

    // 获取请求体
    const { content, attachments = [] } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Post content cannot be empty' },
        { status: 400 }
      );
    }

    // 创建帖子
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        classroom_id: classroomId,
        user_id: user.id,
        content,
        attachments,
      })
      .select()
      .single();

    if (postError) {
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating classroom post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}