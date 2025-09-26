import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { sendStreakReminderNotification } from '@/lib/ai-coach/notification-scheduler';

// 连续学习提醒定时任务
export async function POST(req: NextRequest) {
  try {
    // 验证请求来源
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔥 Processing streak reminders...');
    const supabase = await createAdminClient();
    
    // 获取启用连续提醒的用户
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
    const processedUsers = [];

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
          
          if (result.success) {
            processedUsers.push({
              name: user.display_name || `User ${user.id}`,
              streak
            });
          }
        }
      } catch (userError: any) {
        console.error(`Error processing streak for user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result: { success: false, error: userError?.message || 'Unknown error' }
        });
      }
    }

    const successCount = results.filter(r => r.result.success).length;
    console.log(`✅ Successfully sent ${successCount}/${results.length} streak reminders`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} users, sent ${successCount} notifications`,
      processedUsers,
      totalUsers: users?.length || 0,
      remindersSent: results.length,
      successCount,
      results
    });

  } catch (error: any) {
    console.error('Error in streak cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Streak cron endpoint is working',
    schedule: 'Every day at 10:00 PM',
    description: 'Sends streak reminders to users at milestone streak counts (0, 7, 30, and multiples of 10)'
  });
}

// 计算用户连续学习天数
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

// 判断是否应该发送连续提醒
function shouldSendStreakReminder(streak: number) {
  // 连续0天（中断）或特殊里程碑时发送提醒
  return streak === 0 || streak === 7 || streak === 30 || (streak > 0 && streak % 10 === 0);
}
