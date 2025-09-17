// OneSignal API service for server-side operations
import { createClient } from '@supabase/supabase-js';

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1';
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;

export interface OneSignalNotification {
  app_id?: string;
  headings: { [key: string]: string };
  contents: { [key: string]: string };
  data?: Record<string, any>;
  url?: string;
  big_picture?: string;
  large_icon?: string;
  include_external_user_ids?: string[];
  include_player_ids?: string[];
  included_segments?: string[];
  excluded_segments?: string[];
  send_after?: string;
  delayed_option?: string;
  delivery_time_of_day?: string;
  ttl?: number;
  priority?: number;
  android_channel_id?: string;
  ios_badge_type?: string;
  ios_badge_count?: number;
  collapse_id?: string;
  web_push_topic?: string;
}

export interface OneSignalResponse {
  id: string;
  recipients: number;
  external_id?: string;
  errors?: any[];
}

export class OneSignalService {
  private headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
  };

  /**
   * Send a notification via OneSignal API
   */
  async sendNotification(notification: OneSignalNotification): Promise<OneSignalResponse> {
    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          ...notification,
          app_id: ONESIGNAL_APP_ID,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OneSignal API error: ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send OneSignal notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific users by external user IDs
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    message: string,
    data?: Record<string, any>,
    options?: Partial<OneSignalNotification>
  ): Promise<OneSignalResponse> {
    return this.sendNotification({
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      include_external_user_ids: userIds,
      data,
      ...options,
    });
  }

  /**
   * Send notification to all users in a segment
   */
  async sendToSegment(
    segment: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    options?: Partial<OneSignalNotification>
  ): Promise<OneSignalResponse> {
    return this.sendNotification({
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: [segment],
      data,
      ...options,
    });
  }

  /**
   * Send notification to all subscribed users
   */
  async sendToAll(
    title: string,
    message: string,
    data?: Record<string, any>,
    options?: Partial<OneSignalNotification>
  ): Promise<OneSignalResponse> {
    return this.sendToSegment('Subscribed Users', title, message, data, options);
  }

  /**
   * Schedule a notification for later delivery
   */
  async scheduleNotification(
    notification: OneSignalNotification,
    sendAt: Date
  ): Promise<OneSignalResponse> {
    return this.sendNotification({
      ...notification,
      send_after: sendAt.toISOString(),
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: this.headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel OneSignal notification:', error);
      return false;
    }
  }

  /**
   * Get notification details
   */
  async getNotification(notificationId: string): Promise<any> {
    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get notification: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get OneSignal notification:', error);
      throw error;
    }
  }

  /**
   * Get app statistics
   */
  async getAppStats(): Promise<any> {
    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/apps/${ONESIGNAL_APP_ID}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get app stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get OneSignal app stats:', error);
      throw error;
    }
  }

  /**
   * Create notification templates for common use cases
   */
  createCourseNotification(
    userIds: string[],
    courseTitle: string,
    message: string,
    courseId: string,
    type: 'new_lesson' | 'assignment_due' | 'course_update' = 'course_update'
  ): OneSignalNotification {
    return {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: `📚 ${courseTitle}` },
      contents: { en: message },
      include_external_user_ids: userIds,
      data: {
        type: 'course',
        course_id: courseId,
        notification_type: type,
      },
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/course/${courseId}`,
      large_icon: `${process.env.NEXT_PUBLIC_SITE_URL}/favicon.png`,
    };
  }

  createClassroomNotification(
    userIds: string[],
    classroomName: string,
    message: string,
    classroomSlug: string,
    type: 'live_session' | 'assignment' | 'announcement' = 'announcement'
  ): OneSignalNotification {
    const icons = {
      live_session: '🎥',
      assignment: '📝',
      announcement: '📢',
    };

    return {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: `${icons[type]} ${classroomName}` },
      contents: { en: message },
      include_external_user_ids: userIds,
      data: {
        type: 'classroom',
        classroom_slug: classroomSlug,
        notification_type: type,
      },
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/classroom/${classroomSlug}`,
      large_icon: `${process.env.NEXT_PUBLIC_SITE_URL}/favicon.png`,
    };
  }

  createCommunityNotification(
    userIds: string[],
    groupName: string,
    message: string,
    groupSlug: string,
    type: 'new_post' | 'comment' | 'reaction' = 'new_post'
  ): OneSignalNotification {
    const icons = {
      new_post: '💬',
      comment: '💭',
      reaction: '👍',
    };

    return {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: `${icons[type]} ${groupName}` },
      contents: { en: message },
      include_external_user_ids: userIds,
      data: {
        type: 'community',
        group_slug: groupSlug,
        notification_type: type,
      },
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/community/groups/${groupSlug}`,
      large_icon: `${process.env.NEXT_PUBLIC_SITE_URL}/favicon.png`,
    };
  }
}

export const oneSignalService = new OneSignalService();
