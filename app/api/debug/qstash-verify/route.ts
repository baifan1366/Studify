import { NextResponse } from "next/server";
import { getQueueManager } from "@/utils/qstash/queue-manager";

export async function GET(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app';
    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    
    if (!qstashToken) {
      return NextResponse.json({
        error: "QSTASH_TOKEN not configured"
      }, { status: 500 });
    }
    
    console.log('🔍 Testing QStash configuration...');
    
    // Test 1: List queues
    const queueManager = getQueueManager();
    let queues = [];
    try {
      queues = await queueManager.listQueues();
      console.log('✅ Successfully listed queues:', queues);
    } catch (error: any) {
      console.error('❌ Failed to list queues:', error.message);
    }
    
    // Test 2: Get messages
    let messages = [];
    try {
      const messagesResponse = await fetch(`${qstashUrl}/v2/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
        }
      });
      
      if (messagesResponse.ok) {
        messages = await messagesResponse.json();
        console.log('✅ Successfully fetched messages');
      } else {
        console.error('❌ Failed to fetch messages:', messagesResponse.status);
      }
    } catch (error: any) {
      console.error('❌ Error fetching messages:', error.message);
    }
    
    // Test 3: Get events/logs
    let events = [];
    try {
      const eventsResponse = await fetch(`${qstashUrl}/v2/events`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
        }
      });
      
      if (eventsResponse.ok) {
        events = await eventsResponse.json();
        console.log('✅ Successfully fetched events');
      } else {
        console.error('❌ Failed to fetch events:', eventsResponse.status);
      }
    } catch (error: any) {
      console.error('❌ Error fetching events:', error.message);
    }
    
    // Test 4: Check DLQ
    let dlq = [];
    try {
      const dlqResponse = await fetch(`${qstashUrl}/v2/dlq`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
        }
      });
      
      if (dlqResponse.ok) {
        dlq = await dlqResponse.json();
        console.log('✅ Successfully fetched DLQ');
      } else {
        console.error('❌ Failed to fetch DLQ:', dlqResponse.status);
      }
    } catch (error: any) {
      console.error('❌ Error fetching DLQ:', error.message);
    }
    
    // Analyze events for failures
    const failedEvents = events.filter((e: any) => 
      e.state === 'ERROR' || 
      e.state === 'FAILED' || 
      e.responseStatus >= 400
    );
    
    const recentEvents = events.slice(0, 10);
    
    // Get compress endpoint URL that should be called
    const compressEndpoint = `${baseUrl}/api/video-processing/steps/compress`;
    
    // Check if any events are for our compress endpoint
    const compressEvents = events.filter((e: any) => 
      e.url && e.url.includes('/api/video-processing/steps/compress')
    );
    
    return NextResponse.json({
      configuration: {
        base_url: baseUrl,
        compress_endpoint: compressEndpoint,
        qstash_url: qstashUrl,
        has_token: !!qstashToken,
        token_prefix: qstashToken.substring(0, 10) + '...',
        has_signing_keys: !!process.env.QSTASH_CURRENT_SIGNING_KEY
      },
      queues: {
        count: queues.length,
        list: queues
      },
      messages: {
        total: messages.length,
        pending: messages.filter((m: any) => m.state === 'CREATED').length,
        active: messages.filter((m: any) => m.state === 'ACTIVE').length,
        delivered: messages.filter((m: any) => m.state === 'DELIVERED').length,
        failed: messages.filter((m: any) => m.state === 'FAILED').length,
        sample: messages.slice(0, 3)
      },
      events: {
        total: events.length,
        failures: failedEvents.length,
        compress_events: compressEvents.length,
        recent: recentEvents.map((e: any) => ({
          messageId: e.messageId,
          state: e.state,
          url: e.url,
          queueName: e.queueName,
          time: e.time,
          responseStatus: e.responseStatus,
          error: e.error
        })),
        compress_specific: compressEvents.slice(0, 5)
      },
      dlq: {
        count: dlq.length,
        messages: dlq.slice(0, 3)
      },
      test_results: {
        can_list_queues: queues.length >= 0,
        can_fetch_messages: messages.length >= 0,
        can_fetch_events: events.length >= 0,
        can_access_dlq: dlq.length >= 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
