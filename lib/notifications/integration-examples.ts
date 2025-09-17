// Integration examples for using the notification system across different modules
import { notificationService } from './notification-service';

/**
 * Classroom Module Integration Examples
 */
export class ClassroomNotifications {
  
  // Send notification when a live session is starting
  static async notifyLiveSessionStarting(
    classroomSlug: string,
    classroomName: string,
    sessionTitle: string,
    memberIds: number[]
  ) {
    await notificationService.sendClassroomNotification(
      memberIds,
      classroomName,
      `Live session "${sessionTitle}" is starting in 5 minutes`,
      classroomSlug,
      'live_session'
    );
  }

  // Send notification when a new assignment is posted
  static async notifyNewAssignment(
    classroomSlug: string,
    classroomName: string,
    assignmentTitle: string,
    dueDate: string,
    memberIds: number[]
  ) {
    await notificationService.sendClassroomNotification(
      memberIds,
      classroomName,
      `New assignment "${assignmentTitle}" is due ${dueDate}`,
      classroomSlug,
      'assignment'
    );
  }

  // Send notification for classroom announcements
  static async notifyAnnouncement(
    classroomSlug: string,
    classroomName: string,
    announcement: string,
    memberIds: number[]
  ) {
    await notificationService.sendClassroomNotification(
      memberIds,
      classroomName,
      announcement,
      classroomSlug,
      'announcement'
    );
  }
}

/**
 * Course Module Integration Examples
 */
export class CourseNotifications {
  
  // Send notification when a new lesson is published
  static async notifyNewLesson(
    courseId: string,
    courseTitle: string,
    lessonTitle: string,
    enrolledUserIds: number[]
  ) {
    await notificationService.sendCourseNotification(
      enrolledUserIds,
      courseTitle,
      `New lesson available: "${lessonTitle}"`,
      courseId,
      'new_lesson'
    );
  }

  // Send notification for assignment deadlines
  static async notifyAssignmentDue(
    courseId: string,
    courseTitle: string,
    assignmentTitle: string,
    hoursUntilDue: number,
    enrolledUserIds: number[]
  ) {
    const timeText = hoursUntilDue <= 24 
      ? `${hoursUntilDue} hours` 
      : `${Math.ceil(hoursUntilDue / 24)} days`;
    
    await notificationService.sendCourseNotification(
      enrolledUserIds,
      courseTitle,
      `Assignment "${assignmentTitle}" is due in ${timeText}`,
      courseId,
      'assignment_due'
    );
  }

  // Send notification when course content is updated
  static async notifyCourseUpdate(
    courseId: string,
    courseTitle: string,
    updateDescription: string,
    enrolledUserIds: number[]
  ) {
    await notificationService.sendCourseNotification(
      enrolledUserIds,
      courseTitle,
      updateDescription,
      courseId,
      'course_update'
    );
  }
}

/**
 * Community Module Integration Examples
 */
export class CommunityNotifications {
  
  // Send notification when someone posts in a group
  static async notifyNewPost(
    groupSlug: string,
    groupName: string,
    authorName: string,
    postTitle: string,
    memberIds: number[]
  ) {
    await notificationService.sendCommunityNotification(
      memberIds,
      groupName,
      `${authorName} posted: "${postTitle}"`,
      groupSlug,
      'new_post'
    );
  }

  // Send notification when someone comments on your post
  static async notifyPostComment(
    groupSlug: string,
    groupName: string,
    commenterName: string,
    postTitle: string,
    postAuthorId: number
  ) {
    await notificationService.sendCommunityNotification(
      [postAuthorId],
      groupName,
      `${commenterName} commented on your post "${postTitle}"`,
      groupSlug,
      'comment'
    );
  }

  // Send notification when someone reacts to your content
  static async notifyReaction(
    groupSlug: string,
    groupName: string,
    reactorName: string,
    emoji: string,
    contentType: 'post' | 'comment',
    contentAuthorId: number
  ) {
    await notificationService.sendCommunityNotification(
      [contentAuthorId],
      groupName,
      `${reactorName} reacted ${emoji} to your ${contentType}`,
      groupSlug,
      'reaction'
    );
  }
}

/**
 * User Management Integration Examples
 */
export class UserNotifications {
  
  // Welcome notification for new users
  static async sendWelcomeNotification(userId: number) {
    await notificationService.createNotification({
      user_id: userId,
      kind: 'welcome',
      payload: {
        type: 'welcome',
        message: 'Welcome to Studify! Start exploring courses and join classrooms.',
      },
      title: '🎉 Welcome to Studify!',
      message: 'Welcome to Studify! Start exploring courses and join classrooms.',
      deep_link: '/dashboard',
      send_push: true,
    });
  }

  // Achievement notification
  static async notifyAchievement(
    userId: number,
    achievementTitle: string,
    achievementDescription: string
  ) {
    await notificationService.createNotification({
      user_id: userId,
      kind: 'achievement',
      payload: {
        type: 'achievement',
        title: achievementTitle,
        description: achievementDescription,
      },
      title: `🏆 Achievement Unlocked: ${achievementTitle}`,
      message: achievementDescription,
      deep_link: '/profile/achievements',
      send_push: true,
    });
  }

  // System maintenance notification
  static async notifySystemMaintenance(
    userIds: number[],
    maintenanceDate: string,
    duration: string
  ) {
    await notificationService.createBulkNotifications({
      user_ids: userIds,
      kind: 'system_maintenance',
      payload: {
        type: 'maintenance',
        date: maintenanceDate,
        duration: duration,
      },
      title: '🔧 Scheduled Maintenance',
      message: `System maintenance scheduled for ${maintenanceDate} (${duration})`,
      send_push: true,
    });
  }
}

/**
 * Utility functions for common notification patterns
 */
export class NotificationUtils {
  
  // Get all members of a classroom for notifications
  static async getClassroomMemberIds(classroomSlug: string): Promise<number[]> {
    // This would integrate with your existing classroom member query
    // Example implementation:
    /*
    const { data: members } = await supabase
      .from('classroom_member')
      .select('user_id')
      .eq('classroom_slug', classroomSlug);
    
    return members?.map(m => m.user_id) || [];
    */
    return []; // Placeholder
  }

  // Get all enrolled users in a course
  static async getCourseEnrolledUserIds(courseId: string): Promise<number[]> {
    // This would integrate with your existing course enrollment query
    // Example implementation:
    /*
    const { data: enrollments } = await supabase
      .from('course_enrollment')
      .select('user_id')
      .eq('course_id', courseId);
    
    return enrollments?.map(e => e.user_id) || [];
    */
    return []; // Placeholder
  }

  // Get all members of a community group
  static async getGroupMemberIds(groupSlug: string): Promise<number[]> {
    // This would integrate with your existing group member query
    // Example implementation:
    /*
    const { data: members } = await supabase
      .from('community_group_member')
      .select('user_id')
      .eq('group_slug', groupSlug);
    
    return members?.map(m => m.user_id) || [];
    */
    return []; // Placeholder
  }

  // Schedule notification for later (e.g., assignment reminders)
  static async scheduleNotification(
    userIds: number[],
    title: string,
    message: string,
    scheduleDate: Date,
    notificationType: string,
    payload: Record<string, any> = {}
  ) {
    await notificationService.createBulkNotifications({
      user_ids: userIds,
      kind: notificationType,
      payload,
      title,
      message,
      scheduled_at: scheduleDate,
      send_push: true,
    });
  }
}

/**
 * Example usage in API routes or service functions:
 * 
 * // In a classroom live session API route:
 * await ClassroomNotifications.notifyLiveSessionStarting(
 *   'math-101',
 *   'Advanced Mathematics',
 *   'Calculus Review Session',
 *   [1, 2, 3, 4, 5]
 * );
 * 
 * // In a course lesson creation API route:
 * await CourseNotifications.notifyNewLesson(
 *   'course-123',
 *   'Introduction to React',
 *   'Understanding JSX',
 *   await NotificationUtils.getCourseEnrolledUserIds('course-123')
 * );
 * 
 * // In a community post creation API route:
 * await CommunityNotifications.notifyNewPost(
 *   'react-developers',
 *   'React Developers',
 *   'John Doe',
 *   'Best practices for React hooks',
 *   await NotificationUtils.getGroupMemberIds('react-developers')
 * );
 */
