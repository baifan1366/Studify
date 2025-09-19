import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { z } from "zod";

// Validation schema for video upload
const VideoUploadSchema = z.object({
  attachment_id: z.number().int().positive("Invalid attachment ID"),
});

export async function POST(req: Request) {
  try {
    // Authorize the request - require tutor role
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = VideoUploadSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { attachment_id } = validation.data;
    const client = await createServerClient();

    // 1. Get user's profile ID
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    console.log('🔍 Profile debug info:', {
      auth_user_id: authResult.payload.sub,
      profile_id: profile.id,
      profile_id_type: typeof profile.id
    });

    // 2. Verify attachment exists and user has access
    const { data: attachment, error: attachmentError } = await client
      .from("course_attachments")
      .select("*")
      .eq("id", attachment_id)
      .eq("owner_id", profile.id)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: "Attachment not found or access denied" }, { status: 404 });
    }

    // 3. Verify it's a video file
    if (attachment.type !== 'video') {
      return NextResponse.json({ error: "Only video files can be processed" }, { status: 422 });
    }

    // 4. Check if processing queue already exists
    const { data: existingQueue } = await client
      .from("video_processing_queue")
      .select("*")
      .eq("attachment_id", attachment_id)
      .eq("status", "processing")
      .single();

    if (existingQueue) {
      return NextResponse.json({ 
        message: "Video is already being processed",
        queue_id: existingQueue.public_id,
        status: existingQueue.status,
        current_step: existingQueue.current_step,
        progress: existingQueue.progress_percentage
      }, { status: 200 });
    }

    // 5. Create new processing queue entry
    const { data: newQueue, error: queueError } = await client
      .from("video_processing_queue")
      .insert([{
        attachment_id: attachment_id,
        user_id: authResult.payload.sub,
        current_step: 'compress',
        status: 'pending',
        progress_percentage: 0,
        started_at: new Date().toISOString(),
        processing_metadata: {
          original_size: attachment.size,
          original_type: attachment.type,
          original_title: attachment.title
        }
      }])
      .select("*")
      .single();

    if (queueError || !newQueue) {
      console.error('Failed to create processing queue:', queueError);
      return NextResponse.json({ error: "Failed to create processing queue" }, { status: 500 });
    }

    // 6. Initialize processing steps
    await client.rpc('initialize_video_processing_steps', { queue_id_param: newQueue.id });

    // 7. Queue the first step (compression) with QStash
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app').replace(/\/$/, '');
    const compressionEndpoint = `${baseUrl}/api/video-processing/steps/compress`;

    console.log('🚀 [req_' + Date.now() + '] Video compression queue setup');
    console.log('🔗 [req_' + Date.now() + '] URL construction debug:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      baseUrl: baseUrl,
      finalEndpoint: compressionEndpoint,
      hasDoubleSlash: compressionEndpoint.includes('//api/')
    });

    // Validate QStash token before attempting to use it
    const qstashToken = process.env.QSTASH_TOKEN;
    if (!qstashToken) {
      console.error('QSTASH_TOKEN environment variable not set');
      return NextResponse.json({
        error: "Failed to start video processing",
        details: "QStash service unavailable - token not configured",
      }, { status: 503 });
    }

    try {
      console.log('🚀 Starting QStash job creation...');
      console.log('📋 QStash job details:', {
        queueName: `video-processing-${authResult.payload.sub}`,
        endpoint: compressionEndpoint,
        payload: {
          queue_id: newQueue.id,
          attachment_id: attachment_id,
          user_id: authResult.payload.sub, // Use the UUID from auth, not profile.id
          timestamp: new Date().toISOString(),
        }
      });

      // Use QStash queue manager for better video processing
      const queueManager = getQueueManager();
      const queueName = `video-processing-${authResult.payload.sub}`;
      
      // Ensure the queue exists with proper parallelism (1 video at a time per user)
      console.log('📦 Ensuring queue exists:', queueName);
      await queueManager.ensureQueue(queueName, 1);
      console.log('✅ Queue ensured successfully');

      // Enqueue the video processing job with improved retry configuration
      console.log('📤 Enqueuing job to QStash...');
      const qstashResponse = await queueManager.enqueue(
        queueName,
        compressionEndpoint,
        {
          queue_id: newQueue.id,
          attachment_id: attachment_id,
          user_id: authResult.payload.sub, // Use the UUID from auth, not profile.id
          timestamp: new Date().toISOString(),
        },
        {
          retries: 3 // Maximum allowed by QStash quota
        }
      );

      console.log('✅ QStash enqueue response:', qstashResponse);

      // Update queue with QStash message ID
      console.log('💾 Updating database with QStash message ID...');
      await client
        .from("video_processing_queue")
        .update({ 
          qstash_message_id: qstashResponse.messageId,
          status: 'processing'
        })
        .eq("id", newQueue.id);

      console.log('✅ QStash compression job published:', qstashResponse.messageId);

      // Send notification that processing has started
      await sendVideoProcessingNotification(profile.id.toString(), {
        attachment_id: attachment_id,
        queue_id: newQueue.id,
        attachment_title: attachment.title,
        status: 'started',
        current_step: 'compress',
        progress_percentage: 0
      });

    } catch (qstashError: any) {
      console.error('Failed to queue compression job:', qstashError);
      console.error('QStash error details:', {
        name: qstashError.name,
        message: qstashError.message,
        status: qstashError.status,
        response: qstashError.response
      });
      
      // Mark queue as failed
      await client
        .from("video_processing_queue")
        .update({ 
          status: 'failed',
          error_message: 'Failed to queue compression job',
          error_details: { 
            qstash_error: qstashError.message,
            qstash_status: qstashError.status,
            token_format: qstashToken.startsWith('eyJ') ? 'base64_encoded' : 'unknown',
            endpoint_url: compressionEndpoint,
            base_url: baseUrl
          }
        })
        .eq("id", newQueue.id);

      return NextResponse.json({
        error: "Failed to start video processing",
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Video processing started successfully",
      queue_id: newQueue.public_id,
      status: "processing",
      current_step: "compress",
      progress: 0,
      estimated_completion_time: "5-10 minutes",
      steps: [
        { name: "compress", status: "processing", description: "Optimizing video file" },
        { name: "audio_convert", status: "pending", description: "Converting to audio" },
        { name: "transcribe", status: "pending", description: "Generating transcript" },
        { name: "embed", status: "pending", description: "Creating AI embeddings" }
      ]
    }, { status: 202 });

  } catch (error: any) {
    console.error('Video processing upload error:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
    }, { status: 500 });
  }
}
