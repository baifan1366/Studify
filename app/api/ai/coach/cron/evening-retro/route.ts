import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { sendEveningRetroNotification } from '@/lib/ai-coach/notification-scheduler';

// 晚间复盘提醒定时任务
export async function POST(req: NextRequest) {
  try {
    // 验证请求来源
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🌙 Processing evening retro reminders...');
    const supabase = await createAdminClient();
    
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
    const processedUsers = [];

    for (const user of users || []) {
      try {
        const result = await sendEveningRetroNotification(user.id);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result
        });
        
        if (result.success) {
          processedUsers.push(user.display_name || `User ${user.id}`);
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

    const successCount = results.filter(r => r.result.success).length;
    console.log(`✅ Successfully sent ${successCount}/${results.length} evening retro reminders`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} users, sent ${successCount} notifications`,
      processedUsers,
      totalUsers: results.length,
      successCount,
      results
    });

  } catch (error: any) {
    console.error('Error in evening retro cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Evening retro cron endpoint is working',
    schedule: 'Every day at 8:00 PM',
    description: 'Sends evening reflection reminders to users who have enabled them'
  });
}
