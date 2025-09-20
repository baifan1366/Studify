import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queueId = url.searchParams.get('queue_id');
    const attachmentId = url.searchParams.get('attachment_id');
    const userId = url.searchParams.get('user_id');
    
    if (!queueId || !attachmentId || !userId) {
      // Get the latest queue entry
      const client = await createServerClient();
      const { data: latestQueue } = await client
        .from("video_processing_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!latestQueue) {
        return NextResponse.json({
          error: "No processing queue found"
        }, { status: 404 });
      }
      
      return NextResponse.json({
        message: "Use these parameters to test",
        latest_queue: {
          queue_id: latestQueue.id,
          attachment_id: latestQueue.attachment_id,
          user_id: latestQueue.user_id,
          status: latestQueue.status,
          current_step: latestQueue.current_step
        },
        test_url: `/api/debug/test-compress?queue_id=${latestQueue.id}&attachment_id=${latestQueue.attachment_id}&user_id=${latestQueue.user_id}`
      });
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Test 1: Direct call without signature
    const directUrl = `${baseUrl}/api/video-processing/steps/compress-direct`;
    
    console.log('Testing direct compression endpoint:', directUrl);
    
    const directResponse = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queue_id: parseInt(queueId),
        attachment_id: parseInt(attachmentId),
        user_id: userId,
        timestamp: new Date().toISOString()
      })
    });
    
    const directResult = await directResponse.json();
    
    return NextResponse.json({
      direct_test: {
        status: directResponse.status,
        result: directResult
      },
      parameters_used: {
        queue_id: parseInt(queueId),
        attachment_id: parseInt(attachmentId),
        user_id: userId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
