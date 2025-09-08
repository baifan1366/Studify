import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 获取用户学习路径
export async function GET(req: NextRequest, { params }: { params: { pathId: string } }) {
  try {
    // 验证用户身份
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { pathId } = params;
    
    // 检查权限：只能查看自己的学习路径，除非是教师角色
    if (pathId !== currentUser.id && currentUser.role !== 'teacher') {
      return NextResponse.json({ error: '无权访问此用户的学习路径' }, { status: 403 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 获取用户最新的活跃学习路径
    const { data: pathData, error: pathError } = await supabase
      .from('learning_path')
      .select('*')
      .eq('user_id', pathId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pathError && pathError.code !== 'PGRST116') { // PGRST116是未找到记录的错误
      console.error('获取学习路径失败:', pathError);
      return NextResponse.json({ error: '获取学习路径失败' }, { status: 500 });
    }

    // 如果没有找到学习路径
    if (!pathData) {
      return NextResponse.json({
        success: true,
        path: null,
        milestones: []
      });
    }

    // 获取路径的里程碑
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestone')
      .select('*')
      .eq('path_id', pathData.id)
      .order('order_index', { ascending: true });

    if (milestonesError) {
      console.error('获取里程碑失败:', milestonesError);
      return NextResponse.json({ error: '获取里程碑失败' }, { status: 500 });
    }

    // 格式化返回数据
    const formattedMilestones = milestones.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order_index,
      status: m.status,
      locked: m.status === 'locked',
      resourceType: m.resource_type,
      resourceId: m.resource_id,
      prerequisites: m.prerequisites,
      reward: m.reward
    }));

    // 返回成功响应
    return NextResponse.json({
      success: true,
      path: {
        id: pathData.id,
        goal: pathData.goal,
        duration: pathData.duration,
        progress: pathData.progress,
        createdAt: pathData.created_at,
        updatedAt: pathData.updated_at
      },
      milestones: formattedMilestones
    });

  } catch (error) {
    console.error('获取学习路径失败:', error);
    return NextResponse.json({ error: '获取学习路径失败' }, { status: 500 });
  }
}