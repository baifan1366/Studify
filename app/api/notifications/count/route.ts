import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications/count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user, payload } = authResult;

    const count = await notificationService.getUnreadCount(
      user.profile?.id || parseInt(payload.sub)
    );

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to get notification count:', error);
    return NextResponse.json(
      { error: 'Failed to get notification count' },
      { status: 500 }
    );
  }
}
