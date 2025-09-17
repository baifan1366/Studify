import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(req: Request) {
  try {
    // Authorize the request
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const client = await createServerClient();

    // Build query
    let query = client
      .from("video_processing_queue_status")
      .select("*")
      .eq("user_id", authResult.payload.sub)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status && ['pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: queues, error: queueError } = await query;

    if (queueError) {
      console.error('Error fetching queues:', queueError);
      return NextResponse.json({ error: "Failed to fetch processing queues" }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = client
      .from("video_processing_queue")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", authResult.payload.sub);

    if (status && ['pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'].includes(status)) {
      countQuery = countQuery.eq("status", status);
    }

    const { count } = await countQuery;

    // Format response
    const formattedQueues = (queues || []).map(queue => ({
      queue_id: queue.public_id,
      attachment_id: queue.attachment_id,
      attachment_title: queue.attachment_title,
      attachment_type: queue.attachment_type,
      attachment_size: queue.attachment_size,
      current_step: queue.current_step,
      status: queue.status,
      progress_percentage: queue.progress_percentage,
      retry_count: queue.retry_count,
      max_retries: queue.max_retries,
      error_message: queue.error_message,
      created_at: queue.created_at,
      updated_at: queue.updated_at,
      started_at: queue.started_at,
      completed_at: queue.completed_at,
      cancelled_at: queue.cancelled_at,
      steps: queue.steps || [],
    }));

    return NextResponse.json({
      queues: formattedQueues,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });

  } catch (error: any) {
    console.error('Error fetching processing queues:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
