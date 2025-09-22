import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { z } from "zod";

// Validation schema for QStash job payload
const CompressJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  timestamp: z.string().optional(),
});

/**
 * Direct handler for testing without QStash signature verification
 * This helps diagnose if the issue is with signature verification
 */
export async function POST(req: Request) {
  try {
    console.log('🎬 [DIRECT] Video compression step started');
    console.log('📊 Request details:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    });

    // Parse and validate the QStash job payload
    const body = await req.json();
    console.log('📦 Request body:', body);
    
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
    
    console.log('📋 Processing compression for:', {
      queue_id,
      attachment_id,
      user_id,
      timestamp,
    });

    // Simple test: Just mark the step as completed and queue the next step
    console.log('📝 Marking compression as completed (test mode)...');
    
    // Update step status
    await client
      .from("video_processing_steps")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: {
          test_mode: true,
          message: 'Compression skipped in test mode'
        }
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "compress");

    // Update queue status
    await client
      .from("video_processing_queue")
      .update({
        current_step: 'audio_convert',
        progress_percentage: 25
      })
      .eq("id", queue_id);

    // Queue the next step
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app';
    const audioConvertEndpoint = `${baseUrl}/api/video-processing/steps/audio-convert`;
    
    console.log('🔄 Queueing next step:', audioConvertEndpoint);
    
    const queueManager = getQueueManager();
    // Use consistent queue naming
    const userIdHash = user_id.replace(/-/g, '').substring(0, 12);
    const queueName = `video_${userIdHash}`;
    
    await queueManager.ensureQueue(queueName, 1);
    
    const qstashResponse = await queueManager.enqueue(
      queueName,
      audioConvertEndpoint,
      {
        queue_id: queue_id,
        attachment_id: attachment_id,
        user_id: user_id,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 3
      }
    );

    console.log('✅ Direct compression test completed, next step queued:', qstashResponse.messageId);

    return NextResponse.json({
      message: "Compression test completed successfully",
      data: {
        queue_id,
        attachment_id,
        step: 'compress',
        status: 'completed',
        test_mode: true,
        next_message_id: qstashResponse.messageId
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in direct compression test:', error);
    
    return NextResponse.json({
      error: "Test failed",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
