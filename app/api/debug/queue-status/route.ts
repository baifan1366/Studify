import { NextResponse } from "next/server";
import { getQueueManager } from "@/utils/qstash/queue-manager";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queueName = url.searchParams.get('queue');
    const queueManager = getQueueManager();
    
    if (queueName) {
      // Get specific queue info
      const queueInfo = await queueManager.getQueue(queueName);
      
      // Also fetch messages in the queue
      const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
      const token = process.env.QSTASH_TOKEN;
      
      const messagesResponse = await fetch(`${baseUrl}/v2/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const messages = await messagesResponse.json();
      
      // Filter messages for this queue
      const queueMessages = messages.filter((msg: any) => 
        msg.queueName === queueName
      );
      
      return NextResponse.json({
        queue: queueInfo,
        messages: queueMessages,
        messageCount: queueMessages.length,
        timestamp: new Date().toISOString()
      });
    } else {
      // List all queues
      const queues = await queueManager.listQueues();
      
      // Get all messages
      const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
      const token = process.env.QSTASH_TOKEN;
      
      const messagesResponse = await fetch(`${baseUrl}/v2/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const messages = await messagesResponse.json();
      
      return NextResponse.json({
        queues,
        totalMessages: messages.length,
        messagesByQueue: messages.reduce((acc: any, msg: any) => {
          const queue = msg.queueName || 'no_queue';
          acc[queue] = (acc[queue] || 0) + 1;
          return acc;
        }, {}),
        sampleMessages: messages.slice(0, 5),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('Error checking queue status:', error);
    return NextResponse.json({
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
