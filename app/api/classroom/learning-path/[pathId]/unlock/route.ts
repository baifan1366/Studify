import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 解锁下一个里程碑
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ pathId: string }> }
) {
  const { params } = context;
  try {
    // 验证用户身份
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    const { pathId } = await params;
    const { milestoneId } = await req.json();

    // 验证请求参数
    if (!milestoneId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
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

    // 获取当前里程碑信息
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

    // 获取下一个里程碑
    const { data: nextMilestoneData, error: nextMilestoneError } = await supabase
      .from('milestone')
      .select('*')
      .eq('path_id', pathId)
      .eq('order_index', milestoneData.order_index + 1)
      .single();

    if (nextMilestoneError && nextMilestoneError.code !== 'PGRST116') { // PGRST116是未找到记录的错误
      console.error('获取下一个里程碑失败:', nextMilestoneError);
      return NextResponse.json({ error: '获取下一个里程碑失败' }, { status: 500 });
    }

    // 如果没有下一个里程碑
    if (!nextMilestoneData) {
      return NextResponse.json({
        success: true,
        message: '已经是最后一个里程碑',
        unlocked: false,
        nextMilestone: null
      });
    }

    // 检查下一个里程碑是否已经解锁
    if (nextMilestoneData.status !== 'locked') {
      return NextResponse.json({
        success: true,
        message: '此里程碑已经解锁',
        unlocked: false,
        nextMilestone: {
          id: nextMilestoneData.id,
          title: nextMilestoneData.title,
          status: nextMilestoneData.status
        }
      });
    }

    // 解锁下一个里程碑
    const { error: unlockError } = await supabase
      .from('milestone')
      .update({ status: 'in-progress' })
      .eq('id', nextMilestoneData.id);

    if (unlockError) {
      console.error('解锁里程碑失败:', unlockError);
      return NextResponse.json({ error: '解锁里程碑失败' }, { status: 500 });
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      unlocked: true,
      nextMilestone: {
        id: nextMilestoneData.id,
        title: nextMilestoneData.title,
        status: 'in-progress'
      }
    });

  } catch (error) {
    console.error('解锁里程碑失败:', error);
    return NextResponse.json({ error: '解锁里程碑失败' }, { status: 500 });
  }
}