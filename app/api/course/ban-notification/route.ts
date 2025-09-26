import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

interface BanNotificationRequest {
  courseId: number;
  banReason: string;
  expiresAt: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body: BanNotificationRequest = await request.json();
    const { courseId, banReason, expiresAt } = body;

    if (!courseId || !banReason) {
      return NextResponse.json(
        { error: "Course ID and ban reason are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get course information
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('title, owner_id')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      console.error('[BanNotification] Course fetch error:', courseError);
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get all enrolled students for this course
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('course_enrollment')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (enrollmentError) {
      console.error('[BanNotification] Enrollment fetch error:', enrollmentError);
      return NextResponse.json(
        { error: "Failed to fetch enrollments" },
        { status: 500 }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('[BanNotification] No enrolled students found for course:', courseId);
      return NextResponse.json(
        { 
          message: "No enrolled students to notify",
          courseId,
          enrolledStudents: 0
        },
        { status: 200 }
      );
    }

    // Create system announcement
    const expiryText = expiresAt 
      ? `This ban will expire on ${new Date(expiresAt).toLocaleDateString()}.`
      : 'This is a permanent ban.';
    
    const announcementTitle = `Course Banned: ${course.title}`;
    const announcementContent = `
Dear Students,

We regret to inform you that the course "${course.title}" has been temporarily suspended due to policy violations.

**Reason:** ${banReason}

**Status:** ${expiryText}

We understand this may cause inconvenience and appreciate your understanding. If you have any questions, please contact our support team.

Thank you for your patience.

Best regards,
Studify Administration Team
    `.trim();

    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .insert({
        title: announcementTitle,
        content: announcementContent,
        status: 'sent',
        created_by: authResult.user.id, // System user (admin)
        target_audience: 'custom',
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (announcementError) {
      console.error('[BanNotification] Announcement creation error:', announcementError);
      return NextResponse.json(
        { error: "Failed to create announcement" },
        { status: 500 }
      );
    }

    // Create notification records for each enrolled student
    const notificationPromises = enrollments.map(enrollment => 
      supabase
        .from('notifications')
        .insert({
          user_id: enrollment.user_id,
          kind: 'course_ban',
          payload: {
            courseId: courseId,
            courseName: course.title,
            announcementId: announcement.id,
            banReason: banReason,
            expiresAt: expiresAt,
            title: announcementTitle,
            message: `The course "${course.title}" you are enrolled in has been suspended. Please check the announcement for details.`
          },
          is_read: false,
          is_deleted: false
        })
    );

    const notificationResults = await Promise.allSettled(notificationPromises);
    
    const successfulNotifications = notificationResults.filter(result => result.status === 'fulfilled').length;
    const failedNotifications = notificationResults.filter(result => result.status === 'rejected').length;

    console.log(`[BanNotification] Created ${successfulNotifications} notifications, ${failedNotifications} failed`);

    return NextResponse.json({
      success: true,
      message: "Ban notification sent successfully",
      data: {
        courseId,
        courseName: course.title,
        enrolledStudents: enrollments.length,
        successfulNotifications,
        failedNotifications,
        announcementId: announcement.id,
        expiresAt
      }
    });

  } catch (error: any) {
    console.error('[BanNotification] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
