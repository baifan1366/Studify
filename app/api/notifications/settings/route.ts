import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications/settings - Get user notification settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user, payload } = authResult;

    const settings = await notificationService.getNotificationSettings(user.profile?.id || parseInt(payload.sub));

    return NextResponse.json({ 
      settings: settings || {
        email_notifications: true,
        push_notifications: true,
        course_updates: true,
        community_updates: false,
        marketing_emails: false
      }
    });
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to get notification settings' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/settings - Update user notification settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user, payload } = authResult;

    const body = await request.json();

    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    const updatedSettings = await notificationService.updateNotificationSettings(
      user.profile?.id || parseInt(payload.sub),
      settings
    );

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
