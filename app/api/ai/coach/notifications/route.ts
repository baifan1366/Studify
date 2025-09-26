import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { sendNotification } from '@/lib/notifications/notification-service';

// 发送AI教练通知
export async function POST(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();
    
    const {
      notificationType,
      title,
      message,
      scheduledAt,
      relatedPlanId,
      relatedTaskId,
      relatedRetroId
    } = await req.json();

    // 获取用户profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, onesignal_player_id')
      .eq('user_id', payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;

    // 保存通知记录到数据库
    const { data: notificationRecord, error: insertError } = await supabase
      .from('coach_notifications')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        message,
        scheduled_at: scheduledAt || new Date().toISOString(),
        related_plan_id: relatedPlanId,
        related_task_id: relatedTaskId,
        related_retro_id: relatedRetroId,
        status: 'scheduled'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating notification record:', insertError);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // 如果用户有OneSignal player ID，立即发送推送
    if (profile.onesignal_player_id) {
      try {
        const oneSignalResponse = await sendNotification({
          userIds: [profile.onesignal_player_id],
          title,
          message,
          data: {
            type: 'ai_coach',
            subtype: notificationType,
            notification_id: notificationRecord.public_id,
            plan_id: relatedPlanId,
            task_id: relatedTaskId,
            retro_id: relatedRetroId
          }
        });

        // 更新通知状态
        await supabase
          .from('coach_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            onesignal_id: oneSignalResponse.id
          })
          .eq('id', notificationRecord.id);

        return NextResponse.json({
          notification: notificationRecord,
          oneSignalId: oneSignalResponse.id,
          message: 'Notification sent successfully'
        });

      } catch (oneSignalError: any) {
        console.error('OneSignal error:', oneSignalError);
        
        // 更新通知状态为失败
        await supabase
          .from('coach_notifications')
          .update({
            status: 'failed',
            error_message: oneSignalError?.message || 'Unknown error'
          })
          .eq('id', notificationRecord.id);

        return NextResponse.json({
          success: false,
          notification: notificationRecord,
          error: 'Failed to send push notification',
          details: oneSignalError?.message || 'Unknown error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      notification: notificationRecord,
      message: 'Notification scheduled (no OneSignal player ID)'
    });

  } catch (error) {
    console.error('Error sending AI coach notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 获取用户的AI教练通知历史
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();

    // 获取用户profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = supabase
      .from('coach_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('notification_type', type);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      count: notifications?.length || 0
    });

  } catch (error) {
    console.error('Error fetching AI coach notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 更新通知点击状态
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { notificationId, clicked } = await req.json();
    const supabase = await createAdminClient();

    const { data: updatedNotification, error: updateError } = await supabase
      .from('coach_notifications')
      .update({
        clicked,
        clicked_at: clicked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', notificationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating notification:', updateError);
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Error updating notification click status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
