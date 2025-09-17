import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications - Get user notifications with pagination
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user, payload } = authResult;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const result = await notificationService.getUserNotifications(
      user.profile?.id || parseInt(payload.sub),
      page,
      limit,
      unreadOnly
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('tutor'); // Only tutors/admins can create notifications
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user, payload } = authResult;
    const body = await request.json();

    const {
      user_ids,
      kind,
      payload: notificationPayload,
      title,
      message,
      deep_link,
      image_url,
      scheduled_at,
      send_push = true
    } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'user_ids array is required' },
        { status: 400 }
      );
    }

    if (!kind || !title || !message) {
      return NextResponse.json(
        { error: 'kind, title, and message are required' },
        { status: 400 }
      );
    }

    const notifications = await notificationService.createBulkNotifications({
      user_ids,
      kind,
      payload: notificationPayload || {},
      title,
      message,
      deep_link,
      image_url,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
      send_push,
    });

    return NextResponse.json({ 
      success: true, 
      count: notifications.length,
      notifications 
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
