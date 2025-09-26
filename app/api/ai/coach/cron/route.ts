import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { 
  sendDailyPlanNotification,
  sendEveningRetroNotification,
  sendStreakReminderNotification,
  sendMotivationNotification
} from '@/lib/ai-coach/notification-scheduler';

// AI教练定时任务处理器
export async function POST(req: NextRequest) {
  try {
    // 验证请求来源（可以添加secret token验证）
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskType } = await req.json();
    const supabase = createAdminClient();

    switch (taskType) {
      case 'daily_plan_reminders':
        return await handleDailyPlanReminders(supabase);
      
      case 'evening_retro_reminders':
        return await handleEveningRetroReminders(supabase);
        
      case 'streak_reminders':
        return await handleStreakReminders(supabase);
        
      case 'motivation_messages':
        return await handleMotivationMessages(supabase);
        
      default:
        return NextResponse.json({ error: 'Invalid task type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in AI coach cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 处理每日计划提醒
async function handleDailyPlanReminders(supabase: any) {
  console.log('🌅 Processing daily plan reminders...');
  
  try {
    // 获取启用每日计划提醒的用户
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        timezone,
        coach_settings!inner (
          enable_daily_plan,
          daily_plan_time,
          timezone
        )
      `)
      .eq('coach_settings.enable_daily_plan', true);

    if (error) {
      console.error('Error fetching users for daily plan reminders:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results = [];
    const currentTime = new Date();

    for (const user of users || []) {
      try {
        // 检查是否到了用户设定的提醒时间
        const userTime = getUserLocalTime(currentTime, user.coach_settings.timezone);
        const reminderTime = user.coach_settings.daily_plan_time; // HH:MM:SS format
        
        if (shouldSendDailyPlanReminder(userTime, reminderTime)) {
          const result = await sendDailyPlanNotification(user.id);
          results.push({
            userId: user.id,
            displayName: user.display_name,
            result
          });
        }
      } catch (userError: any) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result: { success: false, error: userError?.message || 'Unknown error' }
        });
      }
    }

    console.log(`✅ Processed ${results.length} daily plan reminders`);
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} daily plan reminders`,
      results
    });

  } catch (error: any) {
    console.error('Error in handleDailyPlanReminders:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

// 处理晚间复盘提醒
async function handleEveningRetroReminders(supabase: any) {
  console.log('🌙 Processing evening retro reminders...');
  
  try {
    // 获取启用晚间复盘提醒的用户
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        timezone,
        coach_settings!inner (
          enable_evening_retro,
          evening_retro_time,
          timezone
        )
      `)
      .eq('coach_settings.enable_evening_retro', true);

    if (error) {
      console.error('Error fetching users for evening retro reminders:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results = [];
    const currentTime = new Date();

    for (const user of users || []) {
      try {
        // 检查是否到了用户设定的复盘时间
        const userTime = getUserLocalTime(currentTime, user.coach_settings.timezone);
        const retroTime = user.coach_settings.evening_retro_time; // HH:MM:SS format
        
        if (shouldSendEveningRetroReminder(userTime, retroTime)) {
          const result = await sendEveningRetroNotification(user.id);
          results.push({
            userId: user.id,
            displayName: user.display_name,
            result
          });
        }
      } catch (userError: any) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result: { success: false, error: userError?.message || 'Unknown error' }
        });
      }
    }

    console.log(`✅ Processed ${results.length} evening retro reminders`);
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} evening retro reminders`,
      results
    });

  } catch (error: any) {
    console.error('Error in handleEveningRetroReminders:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

// 处理连续学习提醒
async function handleStreakReminders(supabase: any) {
  console.log('🔥 Processing streak reminders...');
  
  try {
    // 获取启用连续提醒的用户，并计算他们的连续学习天数
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        coach_settings!inner (enable_streak_reminders)
      `)
      .eq('coach_settings.enable_streak_reminders', true);

    if (error) {
      console.error('Error fetching users for streak reminders:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results = [];

    for (const user of users || []) {
      try {
        // 计算用户的连续学习天数
        const streak = await calculateUserStreak(supabase, user.id);
        
        // 根据策略决定是否发送提醒
        if (shouldSendStreakReminder(streak)) {
          const result = await sendStreakReminderNotification(user.id, streak);
          results.push({
            userId: user.id,
            displayName: user.display_name,
            streak,
            result
          });
        }
      } catch (userError: any) {
        console.error(`Error processing streak for user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result: { success: false, error: (userError as any)?.message || 'Unknown error' }
        });
      }
    }

    console.log(`✅ Processed ${results.length} streak reminders`);
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} streak reminders`,
      results
    });

  } catch (error: any) {
    console.error('Error in handleStreakReminders:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

// 处理激励消息
async function handleMotivationMessages(supabase: any) {
  console.log('💪 Processing motivation messages...');
  
  try {
    // 获取启用激励消息的活跃用户
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        coach_settings!inner (enable_motivation_messages)
      `)
      .eq('coach_settings.enable_motivation_messages', true);

    if (error) {
      console.error('Error fetching users for motivation messages:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results = [];

    // 随机选择一部分用户发送激励消息（避免骚扰）
    const selectedUsers = users
      ?.filter(() => Math.random() < 0.3) // 30%的概率
      ?.slice(0, 20); // 最多20个用户

    for (const user of selectedUsers || []) {
      try {
        const result = await sendMotivationNotification(user.id, 'daily_motivation');
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result
        });
      } catch (userError: any) {
        console.error(`Error sending motivation to user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result: { success: false, error: (userError as any)?.message || 'Unknown error' }
        });
      }
    }

    console.log(`✅ Processed ${results.length} motivation messages`);
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} motivation messages`,
      results
    });

  } catch (error: any) {
    console.error('Error in handleMotivationMessages:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

// 辅助函数：获取用户本地时间
function getUserLocalTime(utcTime: Date, timezone: string) {
  return new Date(utcTime.toLocaleString('en-US', { timeZone: timezone }));
}

// 辅助函数：判断是否应该发送每日计划提醒
function shouldSendDailyPlanReminder(currentTime: Date, reminderTime: string) {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  
  // 在设定时间的5分钟内发送提醒
  const reminderMinutes = hours * 60 + minutes;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  return Math.abs(currentTotalMinutes - reminderMinutes) <= 5;
}

// 辅助函数：判断是否应该发送晚间复盘提醒
function shouldSendEveningRetroReminder(currentTime: Date, retroTime: string) {
  const [hours, minutes] = retroTime.split(':').map(Number);
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  
  // 在设定时间的10分钟内发送提醒
  const retroMinutes = hours * 60 + minutes;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  return Math.abs(currentTotalMinutes - retroMinutes) <= 10;
}

// 辅助函数：计算用户连续学习天数
async function calculateUserStreak(supabase: any, userId: number) {
  try {
    // 获取最近30天的学习记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions } = await supabase
      .from('study_session')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!sessions || sessions.length === 0) {
      return 0;
    }

    // 计算连续天数
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const studyDates = new Set(
      sessions.map((s: any) => new Date(s.created_at).toISOString().split('T')[0])
    );

    // 从今天开始往前查找连续的学习天数
    while (studyDates.has(currentDate.toISOString().split('T')[0])) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;

  } catch (error) {
    console.error('Error calculating user streak:', error);
    return 0;
  }
}

// 辅助函数：判断是否应该发送连续提醒
function shouldSendStreakReminder(streak: number) {
  // 连续0天（中断）或特殊里程碑时发送提醒
  return streak === 0 || streak === 7 || streak === 30 || (streak > 0 && streak % 10 === 0);
}
