import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 更新学习路径进度
export async function PATCH(req: NextRequest, context: { params: { id: string , pathId:string}  }) {
  const { params } = context;
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;
    
    const { pathId } = params;
    const { milestoneId, status } = await req.json();

    // 验证请求参数
    if (!milestoneId || !status) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证状态值
    if (!['in-progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: '无效的状态值' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 验证学习路径所有权
    const { data: pathData, error: pathError } = await supabase
      .from('learning_path')
      .select('user_id')
      .eq('id', pathId)
      .single();

    if (pathError) {
      console.error('获取学习路径失败:', pathError);
      return NextResponse.json({ error: '获取学习路径失败' }, { status: 500 });
    }

    // 检查权限
    if (pathData.user_id !== user.user.id && user.payload.role !== 'tutor') {
      return NextResponse.json({ error: '无权更新此学习路径' }, { status: 403 });
    }

    // 获取里程碑信息
    const { data: milestoneData, error: milestoneError } = await supabase
      .from('milestone')
      .select('*')
      .eq('id', milestoneId)
      .eq('path_id', pathId)
      .single();

    if (milestoneError) {
      console.error('获取里程碑失败:', milestoneError);
      return NextResponse.json({ error: '获取里程碑失败' }, { status: 500 });
    }

    // 检查里程碑状态
    if (milestoneData.status === 'locked') {
      return NextResponse.json({ error: '此里程碑尚未解锁' }, { status: 400 });
    }

    // 更新里程碑状态
    const { error: updateError } = await supabase
      .from('milestone')
      .update({ status })
      .eq('id', milestoneId);

    if (updateError) {
      console.error('更新里程碑状态失败:', updateError);
      return NextResponse.json({ error: '更新里程碑状态失败' }, { status: 500 });
    }

    // 如果状态更新为已完成，尝试解锁下一个里程碑
    let nextMilestone = null;
    if (status === 'completed') {
      // 获取下一个里程碑
      const { data: nextMilestoneData, error: nextMilestoneError } = await supabase
        .from('milestone')
        .select('*')
        .eq('path_id', pathId)
        .eq('order_index', milestoneData.order_index + 1)
        .single();

      if (!nextMilestoneError && nextMilestoneData) {
        // 解锁下一个里程碑
        const { error: unlockError } = await supabase
          .from('milestone')
          .update({ status: 'in-progress' })
          .eq('id', nextMilestoneData.id);

        if (!unlockError) {
          nextMilestone = {
            id: nextMilestoneData.id,
            title: nextMilestoneData.title,
            status: 'in-progress'
          };
        }
      }
    }

    // 获取更新后的学习路径进度
    const { data: updatedPathData, error: updatedPathError } = await supabase
      .from('learning_path')
      .select('progress')
      .eq('id', pathId)
      .single();

    if (updatedPathError) {
      console.error('获取更新后的进度失败:', updatedPathError);
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      milestoneId,
      status,
      progress: updatedPathError ? null : updatedPathData.progress,
      nextMilestone
    });

  } catch (error) {
    console.error('更新学习路径进度失败:', error);
    return NextResponse.json({ error: '更新学习路径进度失败' }, { status: 500 });
  }
}