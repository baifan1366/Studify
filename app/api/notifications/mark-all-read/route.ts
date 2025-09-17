import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { notificationService } from '@/lib/notifications/notification-service';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user, payload } = authResult;

    await notificationService.markAllAsRead(user.profile?.id || parseInt(payload.sub));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
