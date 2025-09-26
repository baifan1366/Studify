import { createAdminClient } from '@/utils/supabase/server';
import { sendNotification } from '@/lib/notifications/notification-service';

/**
 * AI教练通知调度器
 * 处理各种学习提醒和推送通知
 */

// 发送每日学习计划通知
export async function sendDailyPlanNotification(userId: number) {
  const supabase = await createAdminClient();
  
  try {
    // 获取用户信息和设置
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        display_name,
        onesignal_player_id,
        coach_settings (
          enable_daily_plan,
          daily_plan_time,
          coaching_style,
          motivation_type
        )
      `)
      .eq('id', userId)
      .single();

    if (!profile?.coach_settings?.[0]?.enable_daily_plan) {
      return { success: false, reason: 'Daily plan notifications disabled' };
    }

    // 检查今天是否已经有计划
    const today = new Date().toISOString().split('T')[0];
    const { data: existingPlan } = await supabase
      .from('daily_learning_plans')
      .select('id, status')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();

    let title, message;
    
    if (existingPlan && existingPlan.status === 'active') {
      // 提醒继续今日计划
      title = '继续今日学习计划 📚';
      message = `${profile.display_name || '同学'}，您的今日学习计划正在等待您！让我们一起完成今天的学习目标吧 💪`;
    } else {
      // 提醒生成新计划
      title = '开始新的一天学习 🌅';
      message = `早上好${profile.display_name ? '，' + profile.display_name : ''}！AI学习教练为您准备了个性化的每日学习计划，开始精彩的学习之旅吧！`;
    }

    // 发送推送通知
    if (profile.onesignal_player_id) {
      const oneSignalResponse = await sendNotification({
        userIds: [profile.onesignal_player_id],
        title,
        message,
        data: {
          type: 'ai_coach',
          subtype: 'daily_plan',
          action: 'open_dashboard'
        }
      });

      // 记录通知
      await supabase
        .from('coach_notifications')
        .insert({
          user_id: userId,
          notification_type: 'daily_plan',
          title,
          message,
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          onesignal_id: oneSignalResponse.id,
          status: 'sent',
          related_plan_id: existingPlan?.id
        });

      return { success: true, oneSignalId: oneSignalResponse.id };
    }

    return { success: false, reason: 'No OneSignal player ID' };

  } catch (error: any) {
    console.error('Error sending daily plan notification:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// 发送任务提醒通知
export async function sendTaskReminderNotification(userId: number, taskId: number) {
  const supabase = await createAdminClient();
  
  try {
    // 获取任务详情
    const { data: task } = await supabase
      .from('daily_plan_tasks')
      .select(`
        *,
        plan:daily_learning_plans (
          plan_title,
          user_id
        )
      `)
      .eq('id', taskId)
      .single();

    if (!task || task.is_completed) {
      return { success: false, reason: 'Task not found or already completed' };
    }

    // 获取用户信息
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        display_name,
        onesignal_player_id,
        coach_settings (enable_task_reminders)
      `)
      .eq('id', userId)
      .single();

    if (!profile?.coach_settings?.[0]?.enable_task_reminders) {
      return { success: false, reason: 'Task reminders disabled' };
    }

    const title = '学习任务提醒 ⏰';
    const message = `还记得今天的学习任务吗？"${task.task_title}" 正在等待您完成，预计需要${task.estimated_minutes}分钟 📝`;

    // 发送推送通知
    if (profile.onesignal_player_id) {
      const oneSignalResponse = await sendNotification({
        userIds: [profile.onesignal_player_id],
        title,
        message,
        data: {
          type: 'ai_coach',
          subtype: 'task_reminder',
          task_id: task.public_id,
          action: 'open_dashboard'
        }
      });

      // 记录通知
      await supabase
        .from('coach_notifications')
        .insert({
          user_id: userId,
          notification_type: 'task_reminder',
          title,
          message,
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          onesignal_id: oneSignalResponse.id,
          status: 'sent',
          related_task_id: taskId,
          related_plan_id: task.plan_id
        });

      return { success: true, oneSignalId: oneSignalResponse.id };
    }

    return { success: false, reason: 'No OneSignal player ID' };

  } catch (error: any) {
    console.error('Error sending task reminder notification:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// 发送晚间复盘提醒通知
export async function sendEveningRetroNotification(userId: number) {
  const supabase = await createAdminClient();
  
  try {
    // 获取用户信息和设置
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        display_name,
        onesignal_player_id,
        coach_settings (
          enable_evening_retro,
          evening_retro_time,
          coaching_style
        )
      `)
      .eq('id', userId)
      .single();

    if (!profile?.coach_settings?.[0]?.enable_evening_retro) {
      return { success: false, reason: 'Evening retro notifications disabled' };
    }

    // 检查今天是否已经做过复盘
    const today = new Date().toISOString().split('T')[0];
    const { data: existingRetro } = await supabase
      .from('learning_retrospectives')
      .select('id')
      .eq('user_id', userId)
      .eq('retro_date', today)
      .eq('retro_type', 'daily')
      .single();

    if (existingRetro) {
      return { success: false, reason: 'Already completed daily retrospective' };
    }

    // 获取今日学习数据
    const { data: todayPlan } = await supabase
      .from('daily_learning_plans')
      .select(`
        *,
        tasks:daily_plan_tasks (*)
      `)
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();

    let title, message;
    
    if (todayPlan) {
      const completedTasks = todayPlan.tasks.filter((t: any) => t.is_completed).length;
      const totalTasks = todayPlan.tasks.length;
      
      title = '今日学习复盘时间 🌙';
      message = `${profile.display_name || '同学'}，今天您完成了${completedTasks}/${totalTasks}个学习任务！让我们一起回顾今天的学习收获吧 ✨`;
    } else {
      title = '学习反思时间 💭';
      message = `${profile.display_name || '同学'}，花几分钟回顾今天的学习，AI教练将为您提供个性化的学习建议 🤖`;
    }

    // 发送推送通知
    if (profile.onesignal_player_id) {
      const oneSignalResponse = await sendNotification({
        userIds: [profile.onesignal_player_id],
        title,
        message,
        data: {
          type: 'ai_coach',
          subtype: 'evening_retro',
          action: 'open_reflection_modal'
        }
      });

      // 记录通知
      await supabase
        .from('coach_notifications')
        .insert({
          user_id: userId,
          notification_type: 'evening_retro',
          title,
          message,
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          onesignal_id: oneSignalResponse.id,
          status: 'sent',
          related_plan_id: todayPlan?.id
        });

      return { success: true, oneSignalId: oneSignalResponse.id };
    }

    return { success: false, reason: 'No OneSignal player ID' };

  } catch (error: any) {
    console.error('Error sending evening retro notification:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// 发送激励消息通知
export async function sendMotivationNotification(userId: number, context?: string) {
  const supabase = await createAdminClient();
  
  try {
    // 获取用户信息和设置
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        display_name,
        onesignal_player_id,
        points,
        coach_settings (
          enable_motivation_messages,
          motivation_type,
          coaching_style
        )
      `)
      .eq('id', userId)
      .single();

    if (!profile?.coach_settings?.[0]?.enable_motivation_messages) {
      return { success: false, reason: 'Motivation messages disabled' };
    }

    // 根据上下文和用户偏好生成激励消息
    const motivationMessages = getMotivationMessages(
      profile.coach_settings?.[0]?.motivation_type,
      profile.coach_settings?.[0]?.coaching_style,
      context
    );
    
    const selectedMessage = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];

    const title = '学习激励 💪';
    const message = `${profile.display_name || '同学'}，${selectedMessage.text} 您已经积累了${profile.points}积分！`;

    // 发送推送通知
    if (profile.onesignal_player_id) {
      const oneSignalResponse = await sendNotification({
        userIds: [profile.onesignal_player_id],
        title,
        message,
        data: {
          type: 'ai_coach',
          subtype: 'motivation',
          context,
          emoji: selectedMessage.emoji
        }
      });

      // 记录通知
      await supabase
        .from('coach_notifications')
        .insert({
          user_id: userId,
          notification_type: 'motivation',
          title,
          message,
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          onesignal_id: oneSignalResponse.id,
          status: 'sent'
        });

      return { success: true, oneSignalId: oneSignalResponse.id };
    }

    return { success: false, reason: 'No OneSignal player ID' };

  } catch (error: any) {
    console.error('Error sending motivation notification:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// 发送连续学习提醒
export async function sendStreakReminderNotification(userId: number, currentStreak: number) {
  const supabase = await createAdminClient();
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        display_name,
        onesignal_player_id,
        coach_settings (enable_streak_reminders)
      `)
      .eq('id', userId)
      .single();

    if (!profile?.coach_settings?.[0]?.enable_streak_reminders) {
      return { success: false, reason: 'Streak reminders disabled' };
    }

    let title, message;
    
    if (currentStreak === 0) {
      title = '重新开始学习连续记录 🔥';
      message = `${profile.display_name || '同学'}，让我们重新开始建立学习习惯！每天一小步，成长一大步 🚀`;
    } else if (currentStreak < 7) {
      title = `保持学习连续记录 ${currentStreak}天 🔥`;
      message = `太棒了！您已经连续学习${currentStreak}天，继续保持这个好习惯！`;
    } else {
      title = `学习连续记录 ${currentStreak}天 🏆`;
      message = `惊人的坚持！您已经连续学习${currentStreak}天，您是真正的学习达人！`;
    }

    // 发送推送通知
    if (profile.onesignal_player_id) {
      const oneSignalResponse = await sendNotification({
        userIds: [profile.onesignal_player_id],
        title,
        message,
        data: {
          type: 'ai_coach',
          subtype: 'streak_reminder',
          streak_count: currentStreak.toString(),
          action: 'open_dashboard'
        }
      });

      // 记录通知
      await supabase
        .from('coach_notifications')
        .insert({
          user_id: userId,
          notification_type: 'streak_reminder',
          title,
          message,
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          onesignal_id: oneSignalResponse.id,
          status: 'sent'
        });

      return { success: true, oneSignalId: oneSignalResponse.id };
    }

    return { success: false, reason: 'No OneSignal player ID' };

  } catch (error: any) {
    console.error('Error sending streak reminder notification:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// 获取激励消息列表
function getMotivationMessages(motivationType: string, coachingStyle: string, context?: string) {
  const messages = {
    achievement: [
      { text: '每一个小成就都是成功的基石！', emoji: '🏆' },
      { text: '您的努力正在结出硕果！', emoji: '🌟' },
      { text: '坚持学习，成就更好的自己！', emoji: '💪' },
    ],
    progress: [
      { text: '进步虽小，但持续不断！', emoji: '📈' },
      { text: '每天进步一点点，一年就是巨大的改变！', emoji: '🚀' },
      { text: '学习的路上，您一直在前进！', emoji: '⬆️' },
    ],
    social: [
      { text: '和同伴一起学习，收获双倍快乐！', emoji: '👥' },
      { text: '分享学习心得，互相激励成长！', emoji: '🤝' },
      { text: '在学习社区中，您不是一个人在战斗！', emoji: '🌍' },
    ],
    learning: [
      { text: '知识是最好的投资，永远不会贬值！', emoji: '📚' },
      { text: '今天学到的每一点，都是明天的力量！', emoji: '💡' },
      { text: '学习让生活更精彩，让未来更可期！', emoji: '🌈' },
    ]
  };

  // 根据coaching风格调整语气
  if (coachingStyle === 'gentle') {
    return [
      { text: '慢慢来，您已经做得很好了～', emoji: '🌸' },
      { text: '温柔而坚定地向前走～', emoji: '🕊️' },
      { text: '给自己一些时间，学习需要过程～', emoji: '🌱' },
    ];
  } else if (coachingStyle === 'intensive') {
    return [
      { text: '挑战自己，突破极限！', emoji: '🔥' },
      { text: '优秀的人从不给自己找借口！', emoji: '⚡' },
      { text: '今天的努力，决定明天的高度！', emoji: '🏔️' },
    ];
  }

  return messages[motivationType as keyof typeof messages] || messages.learning;
}
