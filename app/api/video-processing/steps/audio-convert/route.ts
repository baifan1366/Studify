import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryManager } from "@/lib/cloudinary-manager";
import { z } from "zod";

// Validation schema for QStash job payload
const AudioConvertJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  timestamp: z.string().optional(),
});

async function convertVideoToAudio(compressedVideoUrl: string, attachmentPublicId: string): Promise<{ audio_url: string; audio_size: number }> {
  console.log('Starting video to audio conversion for:', compressedVideoUrl);
  
  try {
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

    // Convert video to audio using Cloudinary transformation
    const audioResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(
        compressedVideoUrl,
        {
          resource_type: 'video',
          format: 'mp3',
          folder: 'studify/audio',
          public_id: `${attachmentPublicId}_audio`,
          timeout: 180000, // 3 minutes
          // Audio conversion settings
          audio_codec: 'mp3',
          bit_rate: '128k', // 128kbps for good quality and smaller size
          audio_frequency: 22050, // 22kHz frequency
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary audio conversion error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });

    console.log('Audio conversion completed:', {
      audio_url: audioResult.secure_url,
      audio_size: audioResult.bytes,
      duration: audioResult.duration
    });

    return {
      audio_url: audioResult.secure_url,
      audio_size: audioResult.bytes
    };

  } catch (error: any) {
    console.error('Audio conversion failed:', error);
    throw new Error(`Audio conversion failed: ${error.message}`);
  }
}

async function queueNextStep(queueId: number, attachmentId: number, userId: string, audioUrl: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app'
  const transcribeEndpoint = `${baseUrl}/api/video-processing/steps/transcribe`;
  
  console.log('Queueing transcription step for queue:', queueId);
  
  try {
    const queueManager = getQueueManager();
    // Use consistent queue naming
    const userIdHash = userId.replace(/-/g, '').substring(0, 12);
    const queueName = `video_${userIdHash}`;
    
    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);
    
    // Enqueue the next step
    const qstashResponse = await queueManager.enqueue(
      queueName,
      transcribeEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        audio_url: audioUrl,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 3 // Maximum allowed by QStash quota
      }
    );

    console.log('Transcription job queued:', qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to queue transcription:', error);
    throw error;
  }
}

async function handler(req: Request) {
  try {
    console.log('Processing audio conversion job...');

    // Parse and validate the QStash job payload
    const body = await req.json();
    const validation = AudioConvertJobSchema.safeParse(body);
    
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
    
    console.log('Processing audio conversion for:', {
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
      .eq("step_name", "audio_convert");

    // 2. Update queue status
    await client
      .from("video_processing_queue")
      .update({
        status: 'processing',
        current_step: 'audio_convert',
        progress_percentage: 35
      })
      .eq("id", queue_id);

    // 3. Get attachment details and compressed video URL
    const { data: attachment, error: attachmentError } = await client
      .from("course_attachments")
      .select("*")
      .eq("id", attachment_id)
      .single();

    if (attachmentError || !attachment) {
      console.error('❌ Attachment not found:', {
        attachment_id,
        error: attachmentError?.message
      });
      throw new Error(`Attachment not found: ${attachmentError?.message}`);
    }

    console.log('🔍 Attachment details for audio conversion:', {
      attachment_id,
      cloudinary_compressed: attachment.cloudinary_compressed,
      compressed_size: attachment.compressed_size,
      original_url: attachment.cloudinary_url,
      public_id: attachment.public_id
    });

    // Determine which video URL to use for audio conversion
    let videoUrlToUse: string;
    let videoSource: string;

    if (attachment.cloudinary_compressed) {
      videoUrlToUse = attachment.cloudinary_compressed;
      videoSource = 'compressed';
      console.log('✅ Using compressed video URL for audio conversion');
    } else if (attachment.cloudinary_url) {
      videoUrlToUse = attachment.cloudinary_url;
      videoSource = 'original';
      console.warn('⚠️ Compressed video URL missing, using original video URL');
      
      // Check compression step status for debugging
      const { data: compressionStep } = await client
        .from("video_processing_steps")
        .select("status, error_message, output_data")
        .eq("queue_id", queue_id)
        .eq("step_name", "compress")
        .single();

      console.log('🔍 Compression step status:', {
        status: compressionStep?.status,
        error: compressionStep?.error_message,
        hasOutputData: !!compressionStep?.output_data
      });

      // Try to recover compressed URL from step output data
      if (compressionStep?.output_data?.compressed_url) {
        console.log('🔄 Found compressed URL in step output data, updating attachment...');
        await client
          .from('course_attachments')
          .update({ 
            cloudinary_compressed: compressionStep.output_data.compressed_url,
            compressed_size: compressionStep.output_data.compressed_size
          })
          .eq('id', attachment_id);
        
        videoUrlToUse = compressionStep.output_data.compressed_url;
        videoSource = 'recovered_compressed';
        console.log('✅ Recovered and using compressed URL');
      }
    } else {
      throw new Error('No video URL available (neither compressed nor original)');
    }

    console.log('🎥 Video conversion details:', {
      attachment_id,
      video_source: videoSource,
      video_url: videoUrlToUse,
      public_id: attachment.public_id
    });

    // 4. Convert video to audio
    let audioResult: { audio_url: string; audio_size: number };
    try {
      console.log('🔄 Starting audio conversion...');
      audioResult = await convertVideoToAudio(videoUrlToUse, attachment.public_id);
      console.log('✅ Audio conversion completed:', {
        audio_url: audioResult.audio_url,
        audio_size: audioResult.audio_size,
        source_video: videoSource
      });
    } catch (conversionError: any) {
      console.error('Audio conversion failed:', conversionError.message);
      
      // Handle conversion failure
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'audio_convert',
        error_message_param: conversionError.message,
        error_details_param: { step: 'audio_conversion', error: conversionError.message }
      });

      return NextResponse.json({
        error: "Audio conversion failed",
        details: conversionError.message,
        retryable: true,
      }, { status: 500 });
    }

    // 5. Update attachment with audio URL
    await client
      .from('course_attachments')
      .update({ 
        cloudinary_mp3: audioResult.audio_url,
        audio_size: audioResult.audio_size
      })
      .eq('id', attachment_id);

    // 6. Complete the audio conversion step
    await client.rpc('complete_processing_step', {
      queue_id_param: queue_id,
      step_name_param: 'audio_convert',
      output_data_param: {
        audio_url: audioResult.audio_url,
        audio_size: audioResult.audio_size,
        compressed_video_url: attachment.cloudinary_compressed
      }
    });

    // 7. Queue the next step (transcription)
    try {
      const nextQstashMessageId = await queueNextStep(queue_id, attachment_id, user_id, audioResult.audio_url);
      
      // Update queue with next step's QStash message ID
      await client
        .from("video_processing_queue")
        .update({ 
          qstash_message_id: nextQstashMessageId,
          current_step: 'transcribe',
          progress_percentage: 50
        })
        .eq("id", queue_id);

    } catch (queueError: any) {
      console.error('Failed to queue next step:', queueError);
      
      // Mark as failed but keep audio conversion result
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'transcribe',
        error_message_param: 'Failed to queue transcription step',
        error_details_param: { step: 'queue_next', error: queueError.message }
      });

      return NextResponse.json({
        error: "Failed to queue next processing step",
        details: queueError.message,
        retryable: true,
      }, { status: 500 });
    }

    console.log('Audio conversion completed successfully:', {
      queue_id,
      attachment_id,
      audio_url: audioResult.audio_url,
      audio_size: audioResult.audio_size
    });

    return NextResponse.json({
      message: "Audio conversion completed successfully",
      data: {
        queue_id,
        attachment_id,
        step: 'audio_convert',
        status: 'completed',
        output: audioResult,
        next_step: 'transcribe',
        completedAt: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in audio conversion processing:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      retryable: true,
    }, { status: 500 });
  }
}

// Export the handler with QStash signature verification
export const POST = verifySignatureAppRouter(handler);
