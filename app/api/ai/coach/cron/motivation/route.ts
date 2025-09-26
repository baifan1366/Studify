import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { sendMotivationNotification } from '@/lib/ai-coach/notification-scheduler';

// 激励消息定时任务
export async function POST(req: NextRequest) {
  try {
    // 验证请求来源
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('💪 Processing motivation messages...');
    const supabase = await createAdminClient();
    
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

    // 随机选择一部分用户发送激励消息（避免骚扰）
    const selectedUsers = users
      ?.filter(() => Math.random() < 0.3) // 30%的概率
      ?.slice(0, 20); // 最多20个用户

    const results = [];
    const processedUsers = [];

    for (const user of selectedUsers || []) {
      try {
        const result = await sendMotivationNotification(user.id, 'daily_motivation');
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result
        });
        
        if (result.success) {
          processedUsers.push(user.display_name || `User ${user.id}`);
        }
      } catch (userError: any) {
        console.error(`Error sending motivation to user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          displayName: user.display_name,
          result: { success: false, error: userError?.message || 'Unknown error' }
        });
      }
    }

    const successCount = results.filter(r => r.result.success).length;
    console.log(`✅ Successfully sent ${successCount}/${results.length} motivation messages`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} users, sent ${successCount} notifications`,
      processedUsers,
      totalEligibleUsers: users?.length || 0,
      selectedUsers: selectedUsers?.length || 0,
      successCount,
      results
    });

  } catch (error: any) {
    console.error('Error in motivation cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Motivation cron endpoint is working',
    schedule: 'Every day at 12:00 PM',
    description: 'Sends random motivation messages to 30% of users (max 20) who have enabled them'
  });
}
