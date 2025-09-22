import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";

export async function GET(_: Request, { params }: { params: Promise<{ queueId: string }> }) {
  try {
    // Authorize the request
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { queueId } = await params;
    const client = await createServerClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get queue status with all details
    const { data: queueStatus, error: queueError } = await client
      .from("video_processing_queue_status")
      .select("*")
      .eq("public_id", queueId)
      .eq("user_id", authResult.payload.sub)
      .single();

    if (queueError || !queueStatus) {
      return NextResponse.json({ error: "Queue not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({
      queue_id: queueStatus.public_id,
      attachment_id: queueStatus.attachment_id,
      attachment_title: queueStatus.attachment_title,
      current_step: queueStatus.current_step,
      status: queueStatus.status,
      progress_percentage: queueStatus.progress_percentage,
      retry_count: queueStatus.retry_count,
      max_retries: queueStatus.max_retries,
      error_message: queueStatus.error_message,
      created_at: queueStatus.created_at,
      updated_at: queueStatus.updated_at,
      started_at: queueStatus.started_at,
      completed_at: queueStatus.completed_at,
      cancelled_at: queueStatus.cancelled_at,
      steps: queueStatus.steps || [],
      estimated_completion_time: queueStatus.estimated_completion_time,
    });

  } catch (error: any) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ queueId: string }> }) {
  try {
    // Authorize the request
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { queueId } = await params;
    const client = await createServerClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get queue details to verify ownership
    const { data: queue, error: queueError } = await client
      .from("video_processing_queue")
      .select("id, status, current_step, attachment_id")
      .eq("public_id", queueId)
      .eq("user_id", authResult.payload.sub)
      .single();

    if (queueError || !queue) {
      return NextResponse.json({ error: "Queue not found or access denied" }, { status: 404 });
    }

    // Check if queue can be cancelled
    if (queue.status === 'completed' || queue.status === 'cancelled') {
      return NextResponse.json({ 
        error: `Cannot cancel queue with status '${queue.status}'` 
      }, { status: 400 });
    }

    // Cancel the processing queue
    await client.rpc('cancel_video_processing', { queue_id_param: queue.id });
    console.log('Queue cancelled successfully:', queueId);

    // Send cancellation notification
    await sendVideoProcessingNotification(profile.id.toString(), {
      attachment_id: queue.attachment_id,
      queue_id: parseInt(queueId),
      attachment_title: `Video ${queue.attachment_id}`,
      status: 'cancelled'
    });

    return NextResponse.json({
      message: "Queue cancelled successfully",
      queue_id: parseInt(queueId),
      status: "cancelled"
    });

  } catch (error: any) {
    console.error('Error cancelling queue:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
