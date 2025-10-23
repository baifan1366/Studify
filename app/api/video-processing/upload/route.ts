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
      console.error('Attachment lookup error:', {
        attachment_id,
        profile_id: profile.id,
        error: attachmentError
      });
      return NextResponse.json({ 
        error: "Attachment not found or access denied",
        details: attachmentError?.message || "Attachment does not exist or you don't have permission"
      }, { status: 404 });
    }

    // 3. Verify it's a video file
    if (attachment.type !== 'video') {
      return NextResponse.json({ 
        error: "Only video files can be processed",
        details: `File type is '${attachment.type}', expected 'video'`
      }, { status: 422 });
    }

    // 4. Verify video URL is accessible
    if (!attachment.url) {
      return NextResponse.json({ 
        error: "Video file URL is missing",
        details: "The attachment does not have a valid URL"
      }, { status: 422 });
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
        current_step: 'transcribe',
        status: 'pending',
        progress_percentage: 0,
        started_at: new Date().toISOString(),
        processing_metadata: {
          original_size: attachment.size,
          original_type: attachment.type,
          original_title: attachment.title,
          original_url: attachment.url
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

    // 7. Queue the first step (transcribe) with QStash OR process directly in development
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://');
    
    if (isDevelopment) {
      console.log('🚧 Development mode: Processing video directly without QStash');
      
      // In development, trigger the transcription endpoint directly
      try {
        const transcribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/video-processing/steps/transcribe`;
        
        console.log('🎬 Starting direct transcription...');
        
        // Trigger transcription in the background (don't await)
        fetch(transcribeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queue_id: newQueue.id,
            attachment_id: attachment_id,
            user_id: authResult.payload.sub,
            audio_url: attachment.url,
            timestamp: new Date().toISOString(),
          }),
        }).then(async (res) => {
          if (res.ok) {
            console.log('✅ Direct transcription started successfully');
          } else {
            const error = await res.text();
            console.error('❌ Direct transcription failed:', error);
          }
        }).catch((err) => {
          console.error('❌ Direct transcription error:', err);
        });

        // Update queue status
        await client
          .from("video_processing_queue")
          .update({ 
            status: 'processing',
            processing_metadata: {
              ...newQueue.processing_metadata,
              mode: 'direct',
              environment: 'development'
            }
          })
          .eq("id", newQueue.id);

        // Send notification that processing has started
        await sendVideoProcessingNotification(authResult.payload.sub, {
          attachment_id: attachment_id,
          queue_id: newQueue.id,
          attachment_title: attachment.title,
          status: 'started',
          current_step: 'transcribe',
          progress_percentage: 0
        });

        return NextResponse.json({
          message: "Video processing started successfully (development mode)",
          queue_id: newQueue.public_id,
          status: "processing",
          current_step: "transcribe",
          progress: 0,
          mode: "direct",
          estimated_completion_time: "3-5 minutes",
          steps: [
            { name: "transcribe", status: "processing", description: "Generating transcript from video" },
            { name: "embed", status: "pending", description: "Creating AI embeddings" }
          ]
        }, { status: 202 });

      } catch (directError: any) {
        console.error('Failed to start direct processing:', directError);
        
        // Mark queue as failed
        await client
          .from("video_processing_queue")
          .update({ 
            status: 'failed',
            error_message: 'Failed to start direct processing',
            error_details: { 
              error: directError.message
            }
          })
          .eq("id", newQueue.id);

        return NextResponse.json({
          error: "Failed to start video processing",
          details: directError.message || "Direct processing error",
        }, { status: 500 });
      }
    }
    // Production mode: Use QStash for reliable background processing
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app').replace(/\/$/, '');
    const transcribeEndpoint = `${baseUrl}/api/video-processing/steps/transcribe`;

    console.log('🚀 [Production] Video transcription queue setup');
    console.log('🔗 [Production] URL construction:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      baseUrl: baseUrl,
      finalEndpoint: transcribeEndpoint,
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
        endpoint: transcribeEndpoint,
        payload: {
          queue_id: newQueue.id,
          attachment_id: attachment_id,
          user_id: authResult.payload.sub, // Use the UUID from auth, not profile.id
          audio_url: attachment.url, // Use the original video URL directly
          timestamp: new Date().toISOString(),
        }
      });

      // Use QStash queue manager for better video processing
      const queueManager = getQueueManager();
      // Use a simpler queue name without special characters
      // QStash queue names must be alphanumeric with underscores/hyphens only
      const userIdHash = authResult.payload.sub.replace(/-/g, '').substring(0, 12);
      const queueName = `video_${userIdHash}`;
      
      console.log('📦 Queue name validation:', {
        original_user_id: authResult.payload.sub,
        hash: userIdHash,
        queue_name: queueName,
        is_valid: /^[a-zA-Z0-9_-]+$/.test(queueName)
      });
      
      // Ensure the queue exists with proper parallelism (1 video at a time per user)
      console.log('📦 Ensuring queue exists:', queueName);
      try {
        await queueManager.ensureQueue(queueName, 1);
        console.log('✅ Queue ensured successfully');
      } catch (queueError: any) {
        console.warn('⚠️ Queue creation failed, will attempt enqueue anyway:', queueError.message);
        // Continue - the queue might already exist or QStash might create it automatically
      }

      // Enqueue the video processing job with improved retry configuration
      console.log('📤 Enqueuing job to QStash...');
      const qstashResponse = await queueManager.enqueue(
        queueName,
        transcribeEndpoint,
        {
          queue_id: newQueue.id,
          attachment_id: attachment_id,
          user_id: authResult.payload.sub, // Use the UUID from auth, not profile.id
          audio_url: attachment.url, // Use the original video URL directly
          timestamp: new Date().toISOString(),
        },
        {
          retries: 3 // Maximum retries allowed by QStash quota
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

      console.log('✅ QStash transcription job published:', qstashResponse.messageId);

      // Send notification that processing has started
      await sendVideoProcessingNotification(authResult.payload.sub, {
        attachment_id: attachment_id,
        queue_id: newQueue.id,
        attachment_title: attachment.title,
        status: 'started',
        current_step: 'transcribe',
        progress_percentage: 0
      });

    } catch (qstashError: any) {
      console.error('Failed to queue transcription job:', qstashError);
      console.error('QStash error details:', {
        name: qstashError.name,
        message: qstashError.message,
        status: qstashError.status,
        response: qstashError.response,
        stack: qstashError.stack
      });
      
      // Mark queue as failed
      await client
        .from("video_processing_queue")
        .update({ 
          status: 'failed',
          error_message: 'Failed to queue transcription job',
          error_details: { 
            qstash_error: qstashError.message,
            qstash_status: qstashError.status,
            token_format: qstashToken.startsWith('eyJ') ? 'base64_encoded' : 'unknown',
            endpoint_url: transcribeEndpoint,
            base_url: baseUrl
          }
        })
        .eq("id", newQueue.id);

      return NextResponse.json({
        error: "Failed to start video processing",
        details: qstashError.message || "QStash service error",
        debug: {
          endpoint: transcribeEndpoint,
          queueName: `video_${authResult.payload.sub.replace(/-/g, '').substring(0, 12)}`,
          hasToken: !!qstashToken
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Video processing started successfully",
      queue_id: newQueue.public_id,
      status: "processing",
      current_step: "transcribe",
      progress: 0,
      estimated_completion_time: "3-5 minutes",
      steps: [
        { name: "transcribe", status: "processing", description: "Generating transcript from video" },
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
