import { NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { getQueueManager } from "@/utils/qstash/queue-manager";

export async function POST(req: Request) {
  try {
    console.log('🧪 Video Upload Test Started');
    
    // Authorize the request
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse request body (should contain test data)
    const body = await req.json();
    const { test_attachment_id = 999, test_queue_id = 123 } = body;

    console.log('📋 Test data:', {
      user_id: authResult.payload.sub,
      test_attachment_id,
      test_queue_id
    });

    // Test URL construction
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app').replace(/\/$/, '');
    const compressionEndpoint = `${baseUrl}/api/debug/compress-test`; // Use test endpoint without signature verification
    
    console.log('🔗 URL construction test:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      baseUrl: baseUrl,
      finalEndpoint: compressionEndpoint,
      hasDoubleSlash: compressionEndpoint.includes('//api/')
    });

    // Test QStash operations
    const queueManager = getQueueManager();
    const queueName = `video-processing-${authResult.payload.sub}`;
    
    console.log('📦 Testing queue operations...');
    
    // 1. Test queue creation
    await queueManager.ensureQueue(queueName, 1);
    console.log('✅ Queue ensured successfully');

    // 2. Test job enqueue with the same payload structure as real upload
    const testPayload = {
      queue_id: test_queue_id,
      attachment_id: test_attachment_id,
      user_id: authResult.payload.sub,
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Testing job enqueue with payload:', testPayload);

    const qstashResponse = await queueManager.enqueue(
      queueName,
      compressionEndpoint,
      testPayload,
      {
        retries: 3
      }
    );

    console.log('✅ Enqueue successful:', qstashResponse);

    return NextResponse.json({
      success: true,
      message: "Video upload test successful",
      results: {
        auth_user_id: authResult.payload.sub,
        queue_name: queueName,
        endpoint: compressionEndpoint,
        payload: testPayload,
        qstash_response: qstashResponse
      }
    });

  } catch (error: any) {
    console.error('❌ Video upload test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      error: "Video upload test failed",
      details: error.message,
      error_name: error.name,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Video upload test endpoint",
    usage: "Send POST request with optional test_attachment_id and test_queue_id",
    timestamp: new Date().toISOString()
  });
}
