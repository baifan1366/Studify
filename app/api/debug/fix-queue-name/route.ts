import { NextResponse } from "next/server";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const queueManager = getQueueManager();
    const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    const token = process.env.QSTASH_TOKEN;
    
    // Step 1: List all existing queues
    const existingQueues = await queueManager.listQueues();
    console.log('Existing queues:', existingQueues);
    
    // Step 2: Get the stuck queue from database
    const client = await createServerClient();
    const { data: stuckQueue } = await client
      .from("video_processing_queue")
      .select("*")
      .eq("id", 15)  // The stuck queue
      .single();
    
    if (!stuckQueue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }
    
    // Step 3: Determine queue names
    const oldQueueName = `video-processing-${stuckQueue.user_id}`;
    const userIdHash = stuckQueue.user_id.replace(/-/g, '').substring(0, 12);
    const newQueueName = `video_${userIdHash}`;
    
    // Step 4: Check messages in old queue
    let oldQueueMessages = [];
    try {
      const messagesResponse = await fetch(`${baseUrl}/v2/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (messagesResponse.ok) {
        const allMessages = await messagesResponse.json();
        oldQueueMessages = allMessages.filter((m: any) => m.queueName === oldQueueName);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
    
    // Step 5: Create new queue if it doesn't exist
    let newQueueCreated = false;
    if (!existingQueues.find((q: any) => q.name === newQueueName)) {
      await queueManager.ensureQueue(newQueueName, 1);
      newQueueCreated = true;
    }
    
    // Step 6: Queue the compress step with the new queue name
    const baseUrlSite = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app';
    const compressionEndpoint = `${baseUrlSite}/api/video-processing/steps/compress`;
    
    const qstashResponse = await queueManager.enqueue(
      newQueueName,
      compressionEndpoint,
      {
        queue_id: stuckQueue.id,
        attachment_id: stuckQueue.attachment_id,
        user_id: stuckQueue.user_id,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 3
      }
    );
    
    // Update the queue with new message ID
    await client
      .from("video_processing_queue")
      .update({ 
        qstash_message_id: qstashResponse.messageId,
      })
      .eq("id", stuckQueue.id);
    
    return NextResponse.json({
      diagnosis: {
        stuck_queue: {
          id: stuckQueue.id,
          attachment_id: stuckQueue.attachment_id,
          user_id: stuckQueue.user_id,
          status: stuckQueue.status,
          current_step: stuckQueue.current_step
        },
        old_queue_name: oldQueueName,
        new_queue_name: newQueueName,
        old_queue_messages: oldQueueMessages.length,
        existing_queues: existingQueues.map((q: any) => q.name)
      },
      fix_applied: {
        new_queue_created: newQueueCreated,
        message_queued: qstashResponse,
        endpoint: compressionEndpoint
      },
      next_steps: [
        "1. Monitor /api/debug/queue-status?queue=" + newQueueName,
        "2. Check /api/debug/qstash-logs for any errors",
        "3. If still stuck, try /api/video-processing/local-processor"
      ]
    });
    
  } catch (error: any) {
    console.error('Fix queue error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Alternative: Delete old queue and recreate everything
    const { delete_old_queue } = await req.json();
    const queueManager = getQueueManager();
    
    if (delete_old_queue) {
      const oldQueueName = delete_old_queue;
      try {
        await queueManager.deleteQueue(oldQueueName);
        return NextResponse.json({
          message: `Deleted queue: ${oldQueueName}`,
          next: "Run GET to create new queue and requeue messages"
        });
      } catch (error: any) {
        return NextResponse.json({
          error: `Failed to delete queue: ${error.message}`
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      usage: "Send { delete_old_queue: 'queue-name' } to delete a queue"
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
