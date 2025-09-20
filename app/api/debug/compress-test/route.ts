import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for QStash job payload
const CompressJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  timestamp: z.string().optional(),
});

// Test compress handler WITHOUT signature verification
async function handler(req: Request) {
  try {
    console.log('🧪 Compress Test Handler Started');
    console.log('📊 Request details:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    // Log headers for debugging
    const headers: { [key: string]: string } = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('📋 Request headers:', headers);

    // Parse and validate the QStash job payload
    const body = await req.json();
    console.log('📦 Raw body:', body);
    
    const validation = CompressJobSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('❌ Invalid job payload:', validation.error.errors);
      return NextResponse.json(
        { 
          error: "Invalid job payload", 
          details: validation.error.errors,
          received_body: body
        }, 
        { status: 400 }
      );
    }

    const { queue_id, attachment_id, user_id, timestamp } = validation.data;
    
    console.log('✅ Payload validation successful:', {
      queue_id,
      attachment_id,
      user_id,
      timestamp,
    });

    // Simulate successful processing
    console.log('🎉 Compress test completed successfully');

    return NextResponse.json({
      message: "Compress test completed successfully",
      data: {
        queue_id,
        attachment_id,
        user_id,
        step: 'compress',
        status: 'test_completed',
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Compress test error:', error);
    
    return NextResponse.json({
      error: "Compress test failed",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// Export handler WITHOUT signature verification for testing
export const POST = handler;

export async function GET() {
  return NextResponse.json({
    message: "Compress test endpoint (no signature verification)",
    timestamp: new Date().toISOString()
  });
}
