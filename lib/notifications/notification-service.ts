// Notification service for database operations and OneSignal integration
import { createClient } from '@supabase/supabase-js';
import { oneSignalService } from './onesignal-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface NotificationData {
  user_id: number;
  kind: string;
  payload: Record<string, any>;
  title?: string;
  message?: string;
  deep_link?: string;
  image_url?: string;
  scheduled_at?: Date;
  send_push?: boolean;
}

export interface BulkNotificationData {
  user_ids: number[];
  kind: string;
  payload: Record<string, any>;
  title: string;
  message: string;
  deep_link?: string;
  image_url?: string;
  scheduled_at?: Date;
  send_push?: boolean;
}

export class NotificationService {
  /**
   * Create a notification in the database
   */
  async createNotification(data: NotificationData): Promise<any> {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          kind: data.kind,
          payload: data.payload,
          is_read: false,
          is_deleted: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send push notification if requested
      if (data.send_push && data.title && data.message) {
        await this.sendPushNotification(data.user_id, data.title, data.message, data);
      }

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create bulk notifications for multiple users
   */
  async createBulkNotifications(data: BulkNotificationData): Promise<any[]> {
    try {
      const notifications = data.user_ids.map(user_id => ({
        user_id,
        kind: data.kind,
        payload: data.payload,
        is_read: false,
        is_deleted: false,
      }));

      const { data: createdNotifications, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;

      // Send push notifications if requested
      if (data.send_push) {
        await this.sendBulkPushNotifications(data.user_ids, data.title, data.message, data);
      }

      return createdNotifications;
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Send single push notification
   */
  private async sendPushNotification(
    userId: number,
    title: string,
    message: string,
    data: NotificationData
  ): Promise<void> {
    try {
      // Get user's external ID and notification settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('public_id, notification_settings')
        .eq('id', userId)
        .single();

      if (!profile) return;

      const settings = profile.notification_settings || {};
      
      // Check if push notifications are globally enabled
      if (!settings.push_notifications) return;
      
      // Check specific notification type settings
      switch (data.kind) {
        case 'course_notification':
          if (settings.course_updates === false) return;
          break;
        case 'community_notification':
          if (settings.community_updates === false) return;
          break;
        case 'classroom_notification':
          if (settings.course_updates === false) return; // Classroom is part of course updates
          break;
        case 'user_notification':
          // Always send user-specific notifications if push is enabled
          break;
        default:
          if (!settings.push_notifications) return;
      }

      await oneSignalService.sendToUsers(
        [profile.public_id],
        title,
        message,
        data
      );
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Send push notifications to multiple users
   */
  private async sendBulkPushNotifications(
    userIds: number[],
    title: string,
    message: string,
    data: BulkNotificationData
  ): Promise<void> {
    try {
      // Get users' external IDs and notification settings
      const { data: profiles } = await supabase
        .from('profiles')
        .select('public_id, notification_settings')
        .in('id', userIds);

      if (!profiles) return;

      // Filter users who have push notifications enabled based on notification type
      const enabledProfiles = profiles.filter(profile => {
        const settings = profile.notification_settings || {};
        
        // Check if push notifications are globally enabled
        if (!settings.push_notifications) return false;
        
        // Check specific notification type settings
        switch (data.kind) {
          case 'course_notification':
            return settings.course_updates !== false;
          case 'community_notification':
            return settings.community_updates !== false;
          case 'classroom_notification':
            return settings.course_updates !== false; // Classroom is part of course updates
          case 'user_notification':
            return true; // Always send user-specific notifications if push is enabled
          default:
            return settings.push_notifications;
        }
      });

      if (enabledProfiles.length === 0) return;

      const externalIds = enabledProfiles.map(p => p.public_id);

      await oneSignalService.sendToUsers(
        externalIds,
        title,
        message,
        {
          type: data.kind,
          deep_link: data.deep_link,
          ...data.payload,
        },
        {
          large_icon: data.image_url,
          url: data.deep_link,
        }
      );
    } catch (error) {
      console.error('Failed to send bulk push notifications:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('public_id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification (soft delete)
   */
  async deleteNotification(notificationId: string, userId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('public_id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: any[]; total: number; hasMore: boolean }> {
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data: notifications, error, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        notifications: notifications || [],
        total: count || 0,
        hasMore: (count || 0) > page * limit,
      };
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Get user notification settings
   */
  async getNotificationSettings(
    userId: number
  ): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting notification settings:', error);
      return {
        email_notifications: true,
        push_notifications: true,
        course_updates: true,
        community_updates: false,
        marketing_emails: false
      };
    }

    return data.notification_settings || {
      email_notifications: true,
      push_notifications: true,
      course_updates: true,
      community_updates: false,
      marketing_emails: false
    };
  }

  /**
   * Update user notification settings
   */
  async updateNotificationSettings(
    userId: number,
    settings: Record<string, any>
  ): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ notification_settings: settings })
      .eq('id', userId)
      .select('notification_settings')
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      throw new Error('Failed to update notification settings');
    }

    return data.notification_settings || {};
  }

  // Convenience methods for common notification types
  async sendCourseNotification(
    userIds: number[],
    courseTitle: string,
    message: string,
    courseId: string,
    type: 'new_lesson' | 'assignment_due' | 'course_update' = 'course_update'
  ): Promise<void> {
    await this.createBulkNotifications({
      user_ids: userIds,
      kind: 'course_notification',
      payload: {
        course_id: courseId,
        course_title: courseTitle,
        type,
      },
      title: `📚 ${courseTitle}`,
      message,
      deep_link: `/course/${courseId}`,
      send_push: true,
    });
  }

  async sendClassroomNotification(
    userIds: number[],
    classroomName: string,
    message: string,
    classroomSlug: string,
    type: 'live_session' | 'assignment' | 'announcement' = 'announcement'
  ): Promise<void> {
    const icons = {
      live_session: '🎥',
      assignment: '📝',
      announcement: '📢',
    };

    await this.createBulkNotifications({
      user_ids: userIds,
      kind: 'classroom_notification',
      payload: {
        classroom_slug: classroomSlug,
        classroom_name: classroomName,
        type,
      },
      title: `${icons[type]} ${classroomName}`,
      message,
      deep_link: `/classroom/${classroomSlug}`,
      send_push: true,
    });
  }

  async sendCommunityNotification(
    userIds: number[],
    groupName: string,
    message: string,
    groupSlug: string,
    type: 'new_post' | 'comment' | 'reaction' = 'new_post'
  ): Promise<void> {
    const icons = {
      new_post: '💬',
      comment: '💭',
      reaction: '👍',
    };

    await this.createBulkNotifications({
      user_ids: userIds,
      kind: 'community_notification',
      payload: {
        group_slug: groupSlug,
        group_name: groupName,
        type,
      },
      title: `${icons[type]} ${groupName}`,
      message,
      deep_link: `/community/groups/${groupSlug}`,
      send_push: true,
    });
  }
}

export const notificationService = new NotificationService();

/**
 * Helper function to create notifications for all users
 * Used for system-wide announcements
 */
export async function createNotificationForAllUsers({
  kind,
  payload
}: {
  kind: string;
  payload: {
    title: string;
    message: string;
    announcement_id?: number;
    deep_link?: string;
    image_url?: string;
  };
}): Promise<void> {
  try {
    // Get all active user IDs
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('status', 'active')
      .eq('is_deleted', false);

    if (error) throw error;
    if (!profiles || profiles.length === 0) return;

    const userIds = profiles.map(p => p.id);

    // Create bulk notifications
    await notificationService.createBulkNotifications({
      user_ids: userIds,
      kind,
      payload,
      title: payload.title,
      message: payload.message,
      deep_link: payload.deep_link,
      image_url: payload.image_url,
      send_push: true,
    });
  } catch (error) {
    console.error('Failed to create notifications for all users:', error);
    throw error;
  }
}
