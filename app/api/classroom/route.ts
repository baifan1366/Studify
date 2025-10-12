import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * 创建课堂
 * POST /api/classroom
 * 权限: 登录用户（student 也能创建）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份 - 任何登录用户都可以创建课堂
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const { name, description, visibility = 'public' } = await request.json();

    // 验证必填字段
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Classroom name is required' },
        { status: 400 }
      );
    }

    // 验证可见性设置
    if (!['public', 'private'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Visibility must be either "public" or "private"' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 生成唯一的邀请码
    const classCode = generateClassCode();

    // 从 name 生成 slug
    const slug = generateSlug(name);

    // 获取用户的 profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 创建课堂
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        visibility,
        class_code: classCode,
        slug,
        owner_id: profile.id,
      })
      .select(`
        id,
        public_id,
        slug,
        name,
        description,
        class_code,
        visibility,
        owner_id,
        created_at,
        updated_at
      `)
      .single();

    if (classroomError) {
      console.error('Error creating classroom:', classroomError);
      return NextResponse.json(
        { error: 'Failed to create classroom' },
        { status: 500 }
      );
    }

    // 自动将创建者添加为课堂成员（owner 角色）
    const { error: memberError } = await supabase
      .from('classroom_member')
      .insert({
        classroom_id: classroom.id,
        user_id: profile.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding owner as member:', memberError);
      // 如果添加成员失败，删除已创建的课堂
      await supabase
        .from('classroom')
        .delete()
        .eq('id', classroom.id);

      return NextResponse.json(
        { error: 'Failed to set up classroom membership' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      classroom: {
        ...classroom,
        member_count: 1,
        user_role: 'owner',
      },
    });

  } catch (error) {
    console.error('Error in classroom creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取用户的课堂列表
 * GET /api/classroom
 */
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/classroom - Route handler called');
  
  try {
    // 验证用户身份
    console.log('🔍 About to call authorize function...');
    const authResult = await authorize(['student', 'tutor']);
    
    console.log('🔍 Authorization result:', {
      isNextResponse: authResult instanceof NextResponse,
      type: typeof authResult,
      keys: authResult instanceof NextResponse ? 'NextResponse' : Object.keys(authResult),
      authResult: authResult instanceof NextResponse ? 'error response' : authResult
    });
    
    if (authResult instanceof NextResponse) {
      console.log('❌ GET /api/classroom - Authorization failed');
      return authResult;
    }
    
    console.log('✅ GET /api/classroom - Authorization successful, userId:', authResult.sub);

    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // 获取用户的 profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.log('❌ GET /api/classroom - Profile error:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ GET /api/classroom - Profile found, ID:', profile.id);

    // 获取用户参与的所有课堂
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classroom_member')
      .select(`
        role,
        joined_at,
        classroom!classroom_member_classroom_id_fkey(
          id,
          public_id,
          slug,
          name,
          description,
          visibility,
          class_code,
          color,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', profile.id)
      .order('joined_at', { ascending: false });

    console.log('📚 [GET] Classrooms fetched:', {
      count: classrooms?.length || 0,
      firstClassroom: classrooms?.[0]?.classroom ? 
        (Array.isArray(classrooms[0].classroom) ? classrooms[0].classroom[0] : classrooms[0].classroom) : 
        null
    });

    if (classroomsError) {
      console.error('Error fetching classrooms:', classroomsError);
      return NextResponse.json(
        { error: 'Failed to fetch classrooms' },
        { status: 500 }
      );
    }

    // 获取每个课堂的成员数量
    const classroomIds = classrooms.map(item => {
      const classroom = Array.isArray(item.classroom) ? item.classroom[0] : item.classroom;
      return classroom.id;
    });
    const { data: memberCounts, error: memberCountError } = await supabase
      .from('classroom_member')
      .select('classroom_id')
      .in('classroom_id', classroomIds);

    if (memberCountError) {
      console.error('Error fetching member counts:', memberCountError);
    }

    // 计算每个课堂的成员数量
    const memberCountMap = memberCounts?.reduce((acc, member) => {
      acc[member.classroom_id] = (acc[member.classroom_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>) || {};

    // 格式化返回数据
    const formattedClassrooms = classrooms.map(item => {
      const classroom = Array.isArray(item.classroom) ? item.classroom[0] : item.classroom;
      return {
        ...classroom,
        user_role: item.role,
        joined_at: item.joined_at,
        member_count: memberCountMap[classroom.id] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      classrooms: formattedClassrooms,
    });

  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 生成课堂邀请码
 */
function generateClassCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 从课堂名称生成 slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/[\s_-]+/g, '-') // 将空格和下划线转换为连字符
    .replace(/^-+|-+$/g, ''); // 移除开头和结尾的连字符
}
