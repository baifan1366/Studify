import { NextResponse } from "next/server";
import { getQueueManager } from "@/utils/qstash/queue-manager";

export async function GET() {
  try {
    console.log('🔍 QStash Debug Test Started');
    
    // Check environment variables
    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    
    console.log('Environment Variables:', {
      QSTASH_TOKEN: qstashToken ? 'SET (' + qstashToken.length + ' chars)' : 'NOT SET',
      QSTASH_URL: qstashUrl,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      token_format: qstashToken?.startsWith('eyJ') ? 'base64_encoded' : 'unknown'
    });

    if (!qstashToken) {
      return NextResponse.json({
        error: "QSTASH_TOKEN not configured",
        environment: process.env.NODE_ENV,
        available_vars: Object.keys(process.env).filter(key => key.includes('QSTASH'))
      }, { status: 500 });
    }

    // Test QStash queue manager
    try {
      const queueManager = getQueueManager();
      console.log('✅ QueueManager created successfully');

      // Try to list existing queues
      const queues = await queueManager.listQueues();
      console.log('📋 Existing queues:', queues);

      // Test queue creation
      const testQueueName = `debug-test-${Date.now()}`;
      console.log('🔨 Creating test queue:', testQueueName);
      
      await queueManager.ensureQueue(testQueueName, 1);
      console.log('✅ Test queue created successfully');

      // Clean up test queue
      try {
        await queueManager.deleteQueue(testQueueName);
        console.log('🗑️ Test queue deleted successfully');
      } catch (deleteError) {
        console.log('⚠️ Could not delete test queue (might not exist):', deleteError);
      }

      return NextResponse.json({
        success: true,
        message: "QStash connection test successful",
        environment: {
          QSTASH_TOKEN: qstashToken ? 'SET (' + qstashToken.length + ' chars)' : 'NOT SET',
          QSTASH_URL: qstashUrl,
          NEXT_PUBLIC_SITE_URL: siteUrl,
          token_format: qstashToken?.startsWith('eyJ') ? 'base64_encoded' : 'unknown'
        },
        queues: queues,
        test_queue: testQueueName
      });

    } catch (qstashError: any) {
      console.error('❌ QStash error:', qstashError);
      
      return NextResponse.json({
        error: "QStash connection failed",
        details: qstashError.message,
        status: qstashError.status,
        environment: {
          QSTASH_TOKEN: qstashToken ? 'SET (' + qstashToken.length + ' chars)' : 'NOT SET',
          QSTASH_URL: qstashUrl,
          NEXT_PUBLIC_SITE_URL: siteUrl
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🧪 QStash Enqueue Test Started');

    const queueManager = getQueueManager();
    const testQueueName = `test-queue-${Date.now()}`;
    const testEndpoint = `${process.env.NEXT_PUBLIC_SITE_URL}/api/debug/qstash-test/webhook`;

    // Ensure test queue exists
    await queueManager.ensureQueue(testQueueName, 1);
    console.log('✅ Test queue created:', testQueueName);

    // Try to enqueue a test job
    const enqueueResult = await queueManager.enqueue(
      testQueueName,
      testEndpoint,
      {
        test: true,
        timestamp: new Date().toISOString(),
        message: "This is a test message from QStash debug"
      },
      {
        retries: 1
      }
    );

    console.log('✅ Test job enqueued:', enqueueResult);

    // Clean up test queue after a delay
    setTimeout(async () => {
      try {
        await queueManager.deleteQueue(testQueueName);
        console.log('🗑️ Test queue cleaned up');
      } catch (error) {
        console.log('⚠️ Could not clean up test queue:', error);
      }
    }, 5000);

    return NextResponse.json({
      success: true,
      message: "Test job enqueued successfully",
      queue_name: testQueueName,
      endpoint: testEndpoint,
      message_id: enqueueResult.messageId,
      details: enqueueResult
    });

  } catch (error: any) {
    console.error('❌ Enqueue test failed:', error);
    
    return NextResponse.json({
      error: "Enqueue test failed",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
