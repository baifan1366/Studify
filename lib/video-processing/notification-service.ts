import { notificationService } from '@/lib/notifications/notification-service';
import { createServerClient } from "@/utils/supabase/server";

export interface VideoProcessingNotificationData {
  attachment_id: number;
  queue_id: number;
  attachment_title: string;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  current_step?: string;
  progress_percentage?: number;
  error_message?: string;
}

export async function sendVideoProcessingNotification(
  userId: string, // Auth UUID
  data: VideoProcessingNotificationData
) {
  try {
    // Get profile ID from auth UUID
    const client = await createServerClient();
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to get profile for notification:', profileError);
      return; // Skip notification if we can't find the profile
    }
    let title: string;
    let message: string;
    let type: 'course' | 'system' = 'course';

    switch (data.status) {
      case 'started':
        title = 'Video Processing Started';
        message = `Processing "${data.attachment_title}" for AI features. This may take 5-10 minutes.`;
        break;
      
      case 'completed':
        title = 'Video Processing Complete';
        message = `"${data.attachment_title}" has been processed successfully! AI features are now available.`;
        break;
      
      case 'failed':
        title = 'Video Processing Failed';
        message = `Failed to process "${data.attachment_title}". ${data.error_message || 'Please try again later.'}`;
        type = 'system';
        break;
      
      case 'cancelled':
        title = 'Video Processing Cancelled';
        message = `Processing of "${data.attachment_title}" was cancelled.`;
        type = 'system';
        break;
      
      default:
        return; // Unknown status, don't send notification
    }

    await notificationService.createNotification({
      user_id: profile.id,
      title,
      message,
      kind: type,
      payload: {
        attachment_id: data.attachment_id,
        queue_id: data.queue_id,
        action: 'video_processing',
        status: data.status,
        current_step: data.current_step,
        progress_percentage: data.progress_percentage
      }
    });

    console.log(`Video processing notification sent to user ${userId}:`, {
      title,
      status: data.status,
      attachment_id: data.attachment_id
    });

  } catch (error: any) {
    console.error('Failed to send video processing notification:', error);
    // Don't throw error - notification failure shouldn't break the main process
  }
}

export async function sendVideoProcessingProgressNotification(
  userId: string,
  data: VideoProcessingNotificationData & { retry_count?: number }
) {
  try {
    // Get profile ID from auth UUID
    const client = await createServerClient();
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to get profile for progress notification:', profileError);
      return; // Skip notification if we can't find the profile
    }

    // Only send progress notifications for retrying status
    if (data.status !== 'started' || !data.current_step) {
      return;
    }

    const stepNames: Record<string, string> = {
      transcribe: 'Generating Transcript',
      embed: 'Creating AI Embeddings'
    };

    const stepName = stepNames[data.current_step] || data.current_step;
    
    let title = 'Video Processing Update';
    let message = `Processing "${data.attachment_title}": ${stepName}`;
    
    if (data.retry_count && data.retry_count > 0) {
      message += ` (Retry ${data.retry_count})`;
    }
    
    if (data.progress_percentage) {
      message += ` - ${data.progress_percentage}% complete`;
    }

    await notificationService.createNotification({
      user_id: profile.id,
      title,
      message,
      kind: 'course',
      payload: {
        attachment_id: data.attachment_id,
        queue_id: data.queue_id,
        action: 'video_processing_progress',
        current_step: data.current_step,
        progress_percentage: data.progress_percentage,
        retry_count: data.retry_count
      }
    });

  } catch (error: any) {
    console.error('Failed to send video processing progress notification:', error);
  }
}
