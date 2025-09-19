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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🚀 [${requestId}] Video processing upload request started`);
  
  try {
    // Authorize the request - require tutor role
    console.log(`🔐 [${requestId}] Authorizing tutor role...`);
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      console.log(`❌ [${requestId}] Authorization failed`);
      return authResult;
    }
    console.log(`✅ [${requestId}] Authorization successful for user: ${authResult.payload.sub}`);

    // Parse and validate request body
    console.log(`📝 [${requestId}] Parsing request body...`);
    const body = await req.json();
    console.log(`📋 [${requestId}] Request body:`, body);
    
    const validation = VideoUploadSchema.safeParse(body);
    
    if (!validation.success) {
      console.log(`❌ [${requestId}] Request validation failed:`, validation.error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { attachment_id } = validation.data;
    console.log(`📎 [${requestId}] Processing attachment ID: ${attachment_id}`);
    
    console.log(`🗄️ [${requestId}] Creating Supabase client...`);
    const client = await createServerClient();

    // 1. Get user's profile ID
    console.log(`👤 [${requestId}] Fetching user profile...`);
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      console.log(`❌ [${requestId}] Profile not found:`, profileError);
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    console.log(`✅ [${requestId}] Profile found: ${profile.id}`);

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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app/';
    const compressionEndpoint = `${baseUrl}/api/video-processing/steps/compress`;

    console.log('Queueing video compression for attachment:', attachment_id);
    console.log('Compression endpoint:', compressionEndpoint);

    // Validate QStash token before attempting to use it
    console.log(`🔑 [${requestId}] Validating QStash configuration...`);
    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL;
    
    if (!qstashToken) {
      console.error(`❌ [${requestId}] QSTASH_TOKEN environment variable not set`);
      return NextResponse.json({
        error: "Failed to start video processing",
        details: "QStash service unavailable - token not configured",
      }, { status: 503 });
    }

    console.log(`🔧 [${requestId}] QStash Configuration:`, {
      url: qstashUrl || 'https://qstash.upstash.io (default)',
      token_length: qstashToken.length,
      token_prefix: qstashToken.substring(0, 10) + '...',
      token_format: qstashToken.startsWith('eyJ') ? 'base64_encoded' : 'unknown',
      endpoint: compressionEndpoint
    });

    try {
      // Use QStash queue manager for better video processing
      console.log(`📦 [${requestId}] Initializing QStash queue manager...`);
      const queueManager = getQueueManager();
      const queueName = `video-processing-${authResult.payload.sub}`;
      
      console.log(`📋 [${requestId}] Queue name: ${queueName}`);
      
      // Ensure the queue exists with proper parallelism (1 video at a time per user)
      console.log(`🔨 [${requestId}] Creating/ensuring queue exists...`);
      const queueResult = await queueManager.ensureQueue(queueName, 1);
      console.log(`✅ [${requestId}] Queue operation result: ${queueResult}`);

      // Enqueue the video processing job with improved retry configuration
      console.log(`📤 [${requestId}] Enqueuing video processing job...`);
      const payload = {
        queue_id: newQueue.id,
        attachment_id: attachment_id,
        user_id: authResult.payload.sub,
        timestamp: new Date().toISOString(),
      };
      const options = {
        retries: 5, // 增加到5次重试，与后续步骤一致
        delay: '30s' // 增加到30秒延迟，给服务更多启动时间
      };
      
      console.log(`📋 [${requestId}] Enqueue payload:`, payload);
      console.log(`⚙️ [${requestId}] Enqueue options:`, options);
      
      const qstashResponse = await queueManager.enqueue(
        queueName,
        compressionEndpoint,
        payload,
        options
      );
      
      console.log(`✅ [${requestId}] QStash job enqueued successfully:`, {
        messageId: qstashResponse.messageId,
        response: qstashResponse
      });

      // Update queue with QStash message ID
      await client
        .from("video_processing_queue")
        .update({ 
          qstash_message_id: qstashResponse.messageId,
          status: 'processing'
        })
        .eq("id", newQueue.id);

      console.log('QStash compression job published:', qstashResponse.messageId);

      // Send notification that processing has started
      await sendVideoProcessingNotification(authResult.payload.sub, {
        attachment_id: attachment_id,
        queue_id: newQueue.id,
        attachment_title: attachment.title,
        status: 'started',
        current_step: 'compress',
        progress_percentage: 0
      });

    } catch (qstashError: any) {
      console.error(`❌ [${requestId}] Failed to queue compression job:`, qstashError);
      console.error(`🔍 [${requestId}] QStash error details:`, {
        name: qstashError.name,
        message: qstashError.message,
        status: qstashError.status,
        response: qstashError.response,
        cause: qstashError.cause,
        stack: qstashError.stack?.substring(0, 500),
        constructor: qstashError.constructor?.name
      });
      
      // Additional debugging for network issues
      if (qstashError.message?.includes('fetch')) {
        console.error(`🌐 [${requestId}] Network connectivity issue detected`);
      }
      if (qstashError.message?.includes('timeout')) {
        console.error(`⏱️ [${requestId}] Timeout issue detected`);
      }
      if (qstashError.status === 401 || qstashError.status === 403) {
        console.error(`🔐 [${requestId}] Authentication issue detected - check token`);
      }
      if (qstashError.status === 503) {
        console.error(`🚫 [${requestId}] Service unavailable - QStash may be down or overloaded`);
      }
      if (qstashError.status === 429) {
        console.error(`🚦 [${requestId}] Rate limit exceeded`);
      }
      
      // Log environment for debugging
      console.error(`🔧 [${requestId}] Environment debug:`, {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        QSTASH_URL: process.env.QSTASH_URL,
        token_configured: !!process.env.QSTASH_TOKEN,
        site_url: process.env.NEXT_PUBLIC_SITE_URL
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
            token_format: qstashToken.startsWith('eyJ') ? 'valid_base64_token' : 'unknown_format'
          }
        })
        .eq("id", newQueue.id);

      return NextResponse.json({
        error: "Failed to start video processing",
      }, { status: 500 });
    }

    console.log(`🎉 [${requestId}] Video processing started successfully for queue: ${newQueue.public_id}`);
    
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
    console.error(`💥 [${requestId}] Video processing upload error:`, error);
    console.error(`🔍 [${requestId}] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 1000),
      constructor: error.constructor?.name
    });
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      request_id: requestId
    }, { status: 500 });
  }
}
