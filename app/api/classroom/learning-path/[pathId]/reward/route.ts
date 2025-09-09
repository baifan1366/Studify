import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 触发里程碑奖励
export async function POST(
  req: NextRequest,
  context: { params: { id: string , pathId:string} }
) {
  const { params } = context;
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;
    const userRole = authResult.payload.role;

    const { pathId } = params;
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
    if (pathData.user_id !== user.id && userRole !== 'tutor') {
      return NextResponse.json({ error: '无权获取此学习路径的奖励' }, { status: 403 });
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
    if (milestoneData.status !== 'completed') {
      return NextResponse.json({ error: '此里程碑尚未完成，无法获取奖励' }, { status: 400 });
    }

    // 获取奖励信息
    const reward = milestoneData.reward || {};
    
    // 如果有积分奖励，更新用户积分
    if (reward.points) {
      const { error: pointsError } = await supabase.rpc('add_user_points', {
        user_id: user.id,
        points_to_add: reward.points,
        source: 'learning_path_milestone',
        source_id: milestoneId
      });

      if (pointsError) {
        console.error('更新用户积分失败:', pointsError);
        // 继续执行，不中断流程
      }
    }

    // 如果有徽章奖励，添加用户徽章
    if (reward.badge_id) {
      const { error: badgeError } = await supabase
        .from('gamification.user_badge')
        .insert({
          user_id: user.id,
          badge_id: reward.badge_id,
          earned_at: new Date().toISOString()
        });

      if (badgeError) {
        console.error('添加用户徽章失败:', badgeError);
        // 继续执行，不中断流程
      }
    }

    // 标记奖励已领取
    const { error: updateError } = await supabase
      .from('milestone')
      .update({
        reward: { ...reward, claimed: true, claimed_at: new Date().toISOString() }
      })
      .eq('id', milestoneId);

    if (updateError) {
      console.error('更新奖励状态失败:', updateError);
      // 继续执行，不中断流程
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      badge: reward.badge_id ? { id: reward.badge_id } : null,
      points: reward.points || 0,
      message: reward.message || '恭喜完成里程碑！'
    });

  } catch (error) {
    console.error('触发奖励失败:', error);
    return NextResponse.json({ error: '触发奖励失败' }, { status: 500 });
  }
}