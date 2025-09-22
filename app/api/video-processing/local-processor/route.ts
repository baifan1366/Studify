import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

/**
 * Local processor for development - processes videos directly without QStash
 * This is useful when QStash cannot reach localhost
 */
export async function POST(req: Request) {
  try {
    // Authorize the request
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { attachment_id } = await req.json();
    
    if (!attachment_id) {
      return NextResponse.json({ error: "attachment_id is required" }, { status: 400 });
    }

    const client = await createServerClient();

    // Get the queue entry
    const { data: queue } = await client
      .from("video_processing_queue")
      .select("*")
      .eq("attachment_id", attachment_id)
      .eq("user_id", authResult.payload.sub)
      .single();

    if (!queue) {
      return NextResponse.json({ error: "No processing queue found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Process each step sequentially
    const steps = [
      { name: 'compress', endpoint: '/api/video-processing/steps/compress-direct' },
      { name: 'audio-convert', endpoint: '/api/video-processing/steps/audio-convert' },
      { name: 'transcribe', endpoint: '/api/video-processing/steps/transcribe' },
      { name: 'embed', endpoint: '/api/video-processing/steps/embed' }
    ];

    let currentResult = null;
    
    for (const step of steps) {
      console.log(`🔄 Processing ${step.name}...`);
      
      // Update current step in database
      await client
        .from("video_processing_queue")
        .update({
          current_step: step.name,
          status: 'processing'
        })
        .eq("id", queue.id);

      // Call the step endpoint directly (without QStash)
      const response = await fetch(`${baseUrl}${step.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue_id: queue.id,
          attachment_id: attachment_id,
          user_id: authResult.payload.sub,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ ${step.name} failed:`, error);
        
        // Update status to failed
        await client
          .from("video_processing_queue")
          .update({
            status: 'failed',
            error_message: `${step.name} failed: ${error.error || 'Unknown error'}`,
            completed_at: new Date().toISOString()
          })
          .eq("id", queue.id);
        
        return NextResponse.json({
          error: `Processing failed at ${step.name}`,
          details: error
        }, { status: 500 });
      }

      currentResult = await response.json();
      console.log(`✅ ${step.name} completed`);
      
      // Update progress
      const progress = ((steps.indexOf(step) + 1) / steps.length) * 100;
      await client
        .from("video_processing_queue")
        .update({
          progress_percentage: progress
        })
        .eq("id", queue.id);

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark as completed
    await client
      .from("video_processing_queue")
      .update({
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      })
      .eq("id", queue.id);

    return NextResponse.json({
      message: "Video processing completed successfully",
      queue_id: queue.public_id,
      attachment_id: attachment_id,
      processing_time: `${Date.now() - new Date(queue.started_at).getTime()}ms`
    });

  } catch (error: any) {
    console.error('Local processing error:', error);
    return NextResponse.json({
      error: "Processing failed",
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    message: "Local processor endpoint",
    description: "Use POST with { attachment_id } to process video locally without QStash",
    note: "This is for development only when QStash cannot reach localhost"
  });
}
