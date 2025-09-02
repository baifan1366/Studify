import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * 获取课程详情
 * @param request 请求对象
 * @param params 路由参数，包含课程ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // 获取课程ID
    const classroomId = params.id;

    // 查询课程详情
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select(`
        id,
        title,
        description,
        tutor_id,
        created_at,
        updated_at,
        cover_image,
        status,
        enrolled_count
      `)
      .eq('id', classroomId)
      .single();

    if (classroomError) {
      return NextResponse.json(
        { error: 'Failed to fetch classroom details' },
        { status: 500 }
      );
    }

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

    // 格式化响应数据
    const formattedClassroom = {
      id: classroom.id,
      title: classroom.title,
      description: classroom.description,
      tutorId: classroom.tutor_id,
      createdAt: classroom.created_at,
      updatedAt: classroom.updated_at,
      coverImage: classroom.cover_image,
      status: classroom.status,
      enrolledCount: classroom.enrolled_count,
      userRole: membership.role,
    };

    return NextResponse.json(formattedClassroom);
  } catch (error) {
    console.error('Error fetching classroom details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}