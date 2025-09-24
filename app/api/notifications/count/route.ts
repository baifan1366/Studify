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

    // Get user's profile ID (user.profile should be populated by server-guard)
    const profileId = user.profile?.id;
    if (!profileId) {
      console.error('Profile ID not found for user:', payload.sub);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('🔍 Getting notification count for profile ID:', profileId);

    const count = await notificationService.getUnreadCount(profileId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to get notification count:', error);
    return NextResponse.json(
      { error: 'Failed to get notification count' },
      { status: 500 }
    );
  }
}
