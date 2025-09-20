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
    
    // Get recent logs/events from QStash
    const eventsResponse = await fetch(`${baseUrl}/v2/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      return NextResponse.json({
        error: `Failed to fetch events: ${eventsResponse.status}`,
        details: errorText
      }, { status: eventsResponse.status });
    }
    
    const events = await eventsResponse.json();
    
    // Get messages
    const messagesResponse = await fetch(`${baseUrl}/v2/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const messages = await messagesResponse.json();
    
    // Get dead letter queue
    const dlqResponse = await fetch(`${baseUrl}/v2/dlq`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const dlqMessages = dlqResponse.ok ? await dlqResponse.json() : [];
    
    // Group events by message ID and type
    const eventsByMessage = events.reduce((acc: any, event: any) => {
      const msgId = event.messageId;
      if (!acc[msgId]) {
        acc[msgId] = [];
      }
      acc[msgId].push({
        type: event.state,
        time: event.time,
        error: event.error,
        responseStatus: event.responseStatus,
        responseBody: event.responseBody
      });
      return acc;
    }, {});
    
    // Get recent failures
    const failures = events.filter((e: any) => 
      e.state === 'ERROR' || e.state === 'FAILED' || e.responseStatus >= 400
    );
    
    return NextResponse.json({
      summary: {
        totalEvents: events.length,
        activeMessages: messages.length,
        deadLetterQueue: dlqMessages.length,
        recentFailures: failures.length
      },
      recentEvents: events.slice(0, 20).map((e: any) => ({
        messageId: e.messageId,
        state: e.state,
        time: e.time,
        queueName: e.queueName,
        url: e.url,
        responseStatus: e.responseStatus,
        error: e.error
      })),
      failures: failures.slice(0, 10),
      deadLetterQueue: dlqMessages.slice(0, 5),
      eventsByMessage: Object.keys(eventsByMessage).slice(0, 5).reduce((acc: any, key: string) => {
        acc[key] = eventsByMessage[key];
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error fetching QStash logs:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
