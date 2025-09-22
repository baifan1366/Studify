import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    const token = process.env.QSTASH_TOKEN;
    
    if (!token) {
      return NextResponse.json({
        error: "QSTASH_TOKEN not configured"
      }, { status: 500 });
    }
    
    // Get all messages
    const messagesResponse = await fetch(`${baseUrl}/v2/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      return NextResponse.json({
        error: `Failed to fetch messages: ${messagesResponse.status}`,
        details: errorText
      }, { status: messagesResponse.status });
    }
    
    const messages = await messagesResponse.json();
    
    // Group messages by queue
    const messagesByQueue = messages.reduce((acc: any, msg: any) => {
      const queue = msg.queueName || 'no_queue';
      if (!acc[queue]) {
        acc[queue] = [];
      }
      acc[queue].push({
        messageId: msg.messageId,
        state: msg.state,
        url: msg.url,
        createdAt: msg.createdAt,
        retries: msg.retries,
        error: msg.error
      });
      return acc;
    }, {});
    
    // Get events to check for errors
    const eventsResponse = await fetch(`${baseUrl}/v2/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    let recentErrors = [];
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      // Handle different event response formats
      const events = Array.isArray(eventsData) ? eventsData : 
                    (eventsData.events || eventsData.cursor?.events || []);
      
      recentErrors = events
        .filter((e: any) => e.state === 'ERROR' || e.state === 'FAILED' || e.responseStatus >= 400)
        .slice(0, 10)
        .map((e: any) => ({
          messageId: e.messageId,
          state: e.state,
          url: e.url,
          time: e.time,
          responseStatus: e.responseStatus,
          error: e.error,
          responseBody: e.responseBody
        }));
    }
    
    // Find compress-related messages
    const compressMessages = messages.filter((m: any) => 
      m.url && m.url.includes('/compress')
    );
    
    return NextResponse.json({
      summary: {
        total_messages: messages.length,
        messages_by_state: messages.reduce((acc: any, msg: any) => {
          acc[msg.state] = (acc[msg.state] || 0) + 1;
          return acc;
        }, {}),
        queues_with_messages: Object.keys(messagesByQueue)
      },
      messages_by_queue: messagesByQueue,
      compress_related: {
        count: compressMessages.length,
        messages: compressMessages.map((m: any) => ({
          messageId: m.messageId,
          queueName: m.queueName,
          state: m.state,
          url: m.url,
          createdAt: m.createdAt,
          retries: m.retries
        }))
      },
      recent_errors: recentErrors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
