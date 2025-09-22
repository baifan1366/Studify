import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// Debug endpoint to check video processing queue status
export async function GET(
  req: Request,
  { params }: { params: Promise<{ queueId: string }> }
) {
  try {
    const { queueId } = await params;
    const queueIdNum = parseInt(queueId);
    
    if (isNaN(queueIdNum)) {
      return NextResponse.json({ error: "Invalid queue ID" }, { status: 400 });
    }

    const client = await createServerClient();

    // Get queue information
    const { data: queue, error: queueError } = await client
      .from("video_processing_queue")
      .select("*")
      .eq("id", queueIdNum)
      .single();

    if (queueError || !queue) {
      return NextResponse.json(
        { error: `Queue not found: ${queueError?.message}` },
        { status: 404 }
      );
    }

    // Get all processing steps for this queue
    const { data: steps, error: stepsError } = await client
      .from("video_processing_steps")
      .select("*")
      .eq("queue_id", queueIdNum)
      .order("created_at");

    // Get attachment details
    const { data: attachment, error: attachmentError } = await client
      .from("course_attachments")
      .select("*")
      .eq("id", queue.attachment_id)
      .single();

    const debugInfo = {
      queue_info: {
        id: queue.id,
        attachment_id: queue.attachment_id,
        status: queue.status,
        current_step: queue.current_step,
        progress_percentage: queue.progress_percentage,
        retry_count: queue.retry_count,
        max_retries: queue.max_retries,
        created_at: queue.created_at,
        updated_at: queue.updated_at,
        error_message: queue.error_message,
        last_error_at: queue.last_error_at
      },
      attachment_info: attachmentError ? { error: attachmentError.message } : {
        id: attachment?.id,
        title: attachment?.title,
        file_type: attachment?.file_type,
        file_size: attachment?.file_size,
        cloudinary_url: attachment?.cloudinary_url,
        cloudinary_compressed: attachment?.cloudinary_compressed,
        cloudinary_audio: attachment?.cloudinary_audio,
        transcription_text: attachment?.transcription_text ? `${attachment.transcription_text.slice(0, 100)}...` : null,
        compressed_size: attachment?.compressed_size,
        audio_size: attachment?.audio_size,
        public_id: attachment?.public_id
      },
      processing_steps: stepsError ? [{ error: stepsError.message }] : 
        steps?.map(step => ({
          step_name: step.step_name,
          status: step.status,
          retry_count: step.retry_count,
          started_at: step.started_at,
          completed_at: step.completed_at,
          error_message: step.error_message,
          output_data: step.output_data,
          created_at: step.created_at,
          updated_at: step.updated_at
        })) || [],
      step_summary: {
        total_steps: steps?.length || 0,
        completed_steps: steps?.filter(s => s.status === 'completed').length || 0,
        failed_steps: steps?.filter(s => s.status === 'failed').length || 0,
        processing_steps: steps?.filter(s => s.status === 'processing').length || 0,
        pending_steps: steps?.filter(s => s.status === 'pending').length || 0
      }
    };

    return NextResponse.json(debugInfo, { status: 200 });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
