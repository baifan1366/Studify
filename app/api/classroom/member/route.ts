import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * 管理课堂成员角色
 * PATCH /api/classroom/member
 * 输入：classroom_id, user_id, role
 * 权限: classroom owner / admin
 */
export async function PATCH(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const currentUserId = authResult.sub;
    const { classroom_id, user_id, role } = await request.json();

    // 验证必填字段
    if (!classroom_id || !user_id || !role) {
      return NextResponse.json(
        { error: 'classroom_id, user_id, and role are required' },
        { status: 400 }
      );
    }

    // 验证角色值
    if (!['owner', 'tutor', 'student'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be one of: owner, tutor, student' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 获取当前用户的 profile ID
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUserId)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Current user profile not found' },
        { status: 404 }
      );
    }

    // 获取目标用户的 profile ID
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Target user profile not found' },
        { status: 404 }
      );
    }

    // 检查当前用户在课堂中的权限
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom_id)
      .eq('user_id', currentProfile.id)
      .single();

    if (currentMemberError || !currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this classroom' },
        { status: 403 }
      );
    }

    // 检查权限：只有 owner 可以管理成员角色
    if (currentMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only classroom owners can manage member roles' },
        { status: 403 }
      );
    }

    // 检查目标用户是否是课堂成员
    const { data: targetMember, error: targetMemberError } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom_id)
      .eq('user_id', targetProfile.id)
      .single();

    if (targetMemberError || !targetMember) {
      return NextResponse.json(
        { error: 'Target user is not a member of this classroom' },
        { status: 404 }
      );
    }

    // 防止修改自己的角色
    if (currentProfile.id === targetProfile.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // 如果要设置为 owner，需要先将当前 owner 降级
    if (role === 'owner') {
      // 将当前 owner 降级为 tutor
      const { error: demoteError } = await supabase
        .from('classroom_member')
        .update({ role: 'tutor' })
        .eq('classroom_id', classroom_id)
        .eq('user_id', currentProfile.id);

      if (demoteError) {
        console.error('Error demoting current owner:', demoteError);
        return NextResponse.json(
          { error: 'Failed to transfer ownership' },
          { status: 500 }
        );
      }
    }

    // 更新目标用户的角色
    const { data: updatedMember, error: updateError } = await supabase
      .from('classroom_member')
      .update({ role })
      .eq('classroom_id', classroom_id)
      .eq('user_id', targetProfile.id)
      .select(`
        role,
        user_id
      `)
      .single();

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      );
    }

    // Get updated profile info
    const { data: updatedProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email')
      .eq('id', targetProfile.id)
      .single();

    if (profileFetchError || !updatedProfile) {
      console.error('Error fetching updated profile:', profileFetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedProfile.full_name || updatedProfile.email}'s role to ${role}`,
      member: {
        user_id: updatedProfile.user_id,
        profile_id: updatedProfile.id,
        name: updatedProfile.full_name || updatedProfile.email.split('@')[0],
        email: updatedProfile.email,
        role: updatedMember.role,
      },
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取课堂成员列表
 * GET /api/classroom/member?classroom_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const currentUserId = authResult.sub;
    const { searchParams } = new URL(request.url);
    const classroom_id = searchParams.get('classroom_id');

    if (!classroom_id) {
      return NextResponse.json(
        { error: 'classroom_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 获取当前用户的 profile ID
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUserId)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Current user profile not found' },
        { status: 404 }
      );
    }

    // 检查当前用户是否是课堂成员
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom_id)
      .eq('user_id', currentProfile.id)
      .single();

    if (currentMemberError || !currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this classroom' },
        { status: 403 }
      );
    }

    // 获取所有课堂成员
    const { data: members, error: membersError } = await supabase
      .from('classroom_member')
      .select(`
        role,
        joined_at,
        profiles!inner(
          id,
          user_id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('classroom_id', classroom_id)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch classroom members' },
        { status: 500 }
      );
    }

    // 格式化成员数据
    const formattedMembers = members.map(member => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
      return {
        user_id: profile?.user_id,
        profile_id: profile?.id,
        name: profile?.full_name || profile?.email?.split('@')[0],
        email: profile?.email,
        avatar_url: profile?.avatar_url,
        role: member.role,
        joined_at: member.joined_at,
        is_current_user: profile?.id === currentProfile.id,
      };
    });

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      current_user_role: currentMember.role,
    });

  } catch (error) {
    console.error('Error fetching classroom members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 移除课堂成员
 * DELETE /api/classroom/member
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const currentUserId = authResult.sub;
    const { classroom_id, user_id } = await request.json();

    // 验证必填字段
    if (!classroom_id || !user_id) {
      return NextResponse.json(
        { error: 'classroom_id and user_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 获取当前用户的 profile ID
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUserId)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Current user profile not found' },
        { status: 404 }
      );
    }

    // 获取目标用户的 profile ID
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Target user profile not found' },
        { status: 404 }
      );
    }

    // 检查当前用户权限
    const { data: currentMember, error: currentMemberError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom_id)
      .eq('user_id', currentProfile.id)
      .single();

    if (currentMemberError || !currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this classroom' },
        { status: 403 }
      );
    }

    // 检查目标用户是否是课堂成员
    const { data: targetMember, error: targetMemberError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom_id)
      .eq('user_id', targetProfile.id)
      .single();

    if (targetMemberError || !targetMember) {
      return NextResponse.json(
        { error: 'Target user is not a member of this classroom' },
        { status: 404 }
      );
    }

    // 权限检查：只有 owner 可以移除其他成员，或者用户可以移除自己
    const canRemove = currentMember.role === 'owner' || currentProfile.id === targetProfile.id;
    
    if (!canRemove) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this member' },
        { status: 403 }
      );
    }

    // 防止 owner 移除自己（除非是最后一个成员）
    if (currentProfile.id === targetProfile.id && currentMember.role === 'owner') {
      const { data: memberCount, error: countError } = await supabase
        .from('classroom_member')
        .select('id', { count: 'exact' })
        .eq('classroom_id', classroom_id);

      if (countError) {
        console.error('Error counting members:', countError);
        return NextResponse.json(
          { error: 'Failed to check member count' },
          { status: 500 }
        );
      }

      if ((memberCount?.length || 0) > 1) {
        return NextResponse.json(
          { error: 'Classroom owner cannot leave unless they are the only member. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // 移除成员
    const { error: removeError } = await supabase
      .from('classroom_member')
      .delete()
      .eq('classroom_id', classroom_id)
      .eq('user_id', targetProfile.id);

    if (removeError) {
      console.error('Error removing member:', removeError);
      return NextResponse.json(
        { error: 'Failed to remove member from classroom' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member successfully removed from classroom',
    });

  } catch (error) {
    console.error('Error removing classroom member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
