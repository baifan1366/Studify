import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { Storage, File } from "megajs";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryManager } from "@/lib/cloudinary-manager";
import { z } from "zod";

// Validation schema for QStash job payload
const CompressJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  timestamp: z.string().optional(),
});

async function compressVideo(attachment: any): Promise<{ compressed_url: string; compressed_size: number }> {
  console.log('Starting video compression for attachment:', attachment.id);
  
  try {
    // Download video from MEGA
    const email = process.env.MEGA_EMAIL;
    const password = process.env.MEGA_PASSWORD;

    if (!email || !password) {
      throw new Error('MEGA credentials not configured');
    }

    // Create MEGA storage instance
    const storage = new Storage({
      email,
      password,
      keepalive: true,
      autologin: true
    });

    await storage.ready;

    // Parse MEGA URL to get file
    const megaFile = File.fromURL(attachment.url, {});
    await megaFile.loadAttributes();

    // Download file as buffer
    const fileBuffer = await megaFile.downloadBuffer({});
    console.log('Downloaded video file, size:', fileBuffer.length, 'bytes');

    // Get current account and configure Cloudinary
    const currentAccount = cloudinaryManager.getCurrentAccount();
    if (!currentAccount) {
      throw new Error('No available Cloudinary accounts');
    }

    // Configure Cloudinary with current account
    cloudinary.config({
      cloud_name: currentAccount.cloudName,
      api_key: currentAccount.apiKey,
      api_secret: currentAccount.apiSecret,
      secure: true,
    });

    // Upload and compress video using Cloudinary
    const compressionResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'studify/compressed',
          public_id: `${attachment.public_id}_compressed`,
          timeout: 300000, // 5 minutes
          chunk_size: 6000000, // 6MB chunks
          // Video compression settings
          quality: 'auto:good', // Automatic quality optimization
          video_codec: 'h264', // Use H.264 for better compatibility
          bit_rate: '1000k', // Limit bitrate to 1Mbps
          fps: 30, // Limit to 30fps
          width: 1280, // Max width 1280px
          height: 720, // Max height 720px
          crop: 'limit', // Don't upscale
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary compression error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });

    console.log('Video compressed successfully:', {
      original_size: fileBuffer.length,
      compressed_size: compressionResult.bytes,
      compression_ratio: (compressionResult.bytes / fileBuffer.length * 100).toFixed(2) + '%'
    });

    return {
      compressed_url: compressionResult.secure_url,
      compressed_size: compressionResult.bytes
    };

  } catch (error: any) {
    console.error('Video compression failed:', error);
    throw new Error(`Video compression failed: ${error.message}`);
  }
}

async function queueNextStep(queueId: number, attachmentId: number, userId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app'
  const audioConvertEndpoint = `${baseUrl}/api/video-processing/steps/audio-convert`;
  
  console.log('Queueing audio conversion step for queue:', queueId);
  
  try {
    const queueManager = getQueueManager();
    const queueName = `video-processing-${userId}`;
    
    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);
    
    // Enqueue the next step with better retry configuration
    const qstashResponse = await queueManager.enqueue(
      queueName,
      audioConvertEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 3 // Maximum allowed by QStash quota
      }
    );

    console.log('Audio conversion job queued:', qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to queue audio conversion:', error);
    throw error;
  }
}

async function handler(req: Request) {
  try {
    console.log('Processing video compression job...');

    // Parse and validate the QStash job payload
    const body = await req.json();
    const validation = CompressJobSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Invalid job payload:', validation.error.errors);
      return NextResponse.json(
        { 
          error: "Invalid job payload", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { queue_id, attachment_id, user_id, timestamp } = validation.data;
    const client = await createServerClient();
    
    console.log('Processing compression for:', {
      queue_id,
      attachment_id,
      user_id,
      timestamp,
    });

    // 1. Update step status to processing
    await client
      .from("video_processing_steps")
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "compress");

    // 2. Update queue status
    await client
      .from("video_processing_queue")
      .update({
        status: 'processing',
        current_step: 'compress',
        progress_percentage: 10
      })
      .eq("id", queue_id);

    // 3. Get attachment details
    const { data: attachment, error: attachmentError } = await client
      .from("course_attachments")
      .select("*")
      .eq("id", attachment_id)
      .single();

    if (attachmentError || !attachment) {
      throw new Error(`Attachment not found: ${attachmentError?.message}`);
    }

    // 4. Compress the video
    let compressionResult: { compressed_url: string; compressed_size: number };
    try {
      compressionResult = await compressVideo(attachment);
    } catch (compressionError: any) {
      console.error('Video compression failed:', compressionError.message);
      
      // Handle compression failure
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'compress',
        error_message_param: compressionError.message,
        error_details_param: { step: 'compression', error: compressionError.message }
      });

      return NextResponse.json({
        error: "Video compression failed",
        details: compressionError.message,
        retryable: true,
      }, { status: 500 });
    }

    // 5. Update attachment with compressed video URL
    const { error: updateError } = await client
      .from('course_attachments')
      .update({ 
        cloudinary_compressed: compressionResult.compressed_url,
        compressed_size: compressionResult.compressed_size
      })
      .eq('id', attachment_id);

    if (updateError) {
      console.error('Failed to update attachment with compressed URL:', updateError);
      throw new Error(`Failed to update attachment: ${updateError.message}`);
    }
    
    console.log('✅ Successfully updated attachment with compressed URL:', {
      attachment_id,
      compressed_url: compressionResult.compressed_url,
      compressed_size: compressionResult.compressed_size
    });

    // 6. Complete the compression step
    await client.rpc('complete_processing_step', {
      queue_id_param: queue_id,
      step_name_param: 'compress',
      output_data_param: {
        compressed_url: compressionResult.compressed_url,
        compressed_size: compressionResult.compressed_size,
        original_size: attachment.size,
        compression_ratio: (compressionResult.compressed_size / attachment.size * 100).toFixed(2) + '%'
      }
    });

    // 7. Queue the next step (audio conversion)
    try {
      const nextQstashMessageId = await queueNextStep(queue_id, attachment_id, user_id);
      
      // Update queue with next step's QStash message ID
      await client
        .from("video_processing_queue")
        .update({ 
          qstash_message_id: nextQstashMessageId,
          current_step: 'audio_convert',
          progress_percentage: 25
        })
        .eq("id", queue_id);

    } catch (queueError: any) {
      console.error('Failed to queue next step:', queueError);
      
      // Mark as failed but keep compression result
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'audio_convert',
        error_message_param: 'Failed to queue audio conversion step',
        error_details_param: { step: 'queue_next', error: queueError.message }
      });

      return NextResponse.json({
        error: "Failed to queue next processing step",
        details: queueError.message,
        retryable: true,
      }, { status: 500 });
    }

    console.log('Video compression completed successfully:', {
      queue_id,
      attachment_id,
      compressed_url: compressionResult.compressed_url,
      compressed_size: compressionResult.compressed_size
    });

    return NextResponse.json({
      message: "Video compression completed successfully",
      data: {
        queue_id,
        attachment_id,
        step: 'compress',
        status: 'completed',
        output: compressionResult,
        next_step: 'audio_convert',
        completedAt: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in compression processing:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      retryable: true,
    }, { status: 500 });
  }
}

// Export the handler with QStash signature verification
export const POST = verifySignatureAppRouter(handler);
