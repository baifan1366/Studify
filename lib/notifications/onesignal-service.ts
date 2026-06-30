// OneSignal API service for server-side operations
const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

function getOneSignalConfig() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const rawApiKey = (
    process.env.ONESIGNAL_API_KEY ||
    process.env.ONESIGNAL_REST_API_KEY
  )?.trim();
  const apiKey = rawApiKey?.replace(/^(?:basic|key)\s+/i, '');

  if (!appId || !apiKey) return null;
  return { appId, apiKey };
}

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
  skipped?: boolean;
}

export class OneSignalService {
  /**
   * Send a notification via OneSignal API
   */
  async sendNotification(notification: OneSignalNotification): Promise<OneSignalResponse> {
    const config = getOneSignalConfig();
    if (!config) {
      console.warn('OneSignal push skipped: app ID or API key is not configured.');
      return { id: '', recipients: 0, skipped: true };
    }

    try {
      const response = await fetch(ONESIGNAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${config.apiKey}`,
        },
        body: JSON.stringify({
          ...notification,
          app_id: config.appId,
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
    const config = getOneSignalConfig();
    if (!config) return false;

    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/${notificationId}?app_id=${config.appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Key ${config.apiKey}` },
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
    const config = getOneSignalConfig();
    if (!config) throw new Error('OneSignal is not configured');

    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/${notificationId}?app_id=${config.appId}`, {
        headers: { Authorization: `Key ${config.apiKey}` },
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
    const config = getOneSignalConfig();
    if (!config) throw new Error('OneSignal is not configured');

    try {
      const response = await fetch(`https://api.onesignal.com/apps/${config.appId}`, {
        headers: { Authorization: `Key ${config.apiKey}` },
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
