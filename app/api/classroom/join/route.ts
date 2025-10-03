import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * 通过邀请码加入课堂
 * POST /api/classroom/join
 * 输入：class_code
 * 权限: 登录用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const { class_code } = await request.json();

    // 验证邀请码
    if (!class_code || class_code.trim() === '') {
      return NextResponse.json(
        { error: 'Class code is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

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

    // 查找课堂
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select(`
        id,
        public_id,
        slug,
        name,
        description,
        visibility,
        owner_id,
        created_at,
        updated_at
      `)
      .eq('class_code', class_code.trim().toUpperCase())
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json(
        { error: 'Invalid class code' },
        { status: 404 }
      );
    }

    // 检查用户是否已经是课堂成员
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', memberCheckError);
      return NextResponse.json(
        { error: 'Failed to check membership status' },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json(
        { 
          error: 'You are already a member of this classroom',
          classroom: {
            ...classroom,
            user_role: existingMember.role,
          }
        },
        { status: 409 }
      );
    }

    // 添加用户为课堂成员
    const { data: newMember, error: joinError } = await supabase
      .from('classroom_member')
      .insert({
        classroom_id: classroom.id,
        user_id: profile.id,
        role: 'student', // 默认角色为学生
      })
      .select('role, joined_at')
      .single();

    if (joinError) {
      console.error('Error joining classroom:', joinError);
      return NextResponse.json(
        { error: 'Failed to join classroom' },
        { status: 500 }
      );
    }

    // 获取课堂成员数量
    const { data: memberCount, error: countError } = await supabase
      .from('classroom_member')
      .select('id', { count: 'exact' })
      .eq('classroom_id', classroom.id);

    if (countError) {
      console.error('Error getting member count:', countError);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined classroom',
      classroom: {
        ...classroom,
        user_role: newMember.role,
        joined_at: newMember.joined_at,
        member_count: memberCount?.length || 0,
      },
    });

  } catch (error) {
    console.error('Error joining classroom:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
