import { NextResponse } from "next/server";

// Test webhook endpoint for QStash testing
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log('QStash webhook received:', body);
    
    return NextResponse.json({
      success: true,
      message: "Webhook received successfully",
      received_data: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('QStash webhook error:', error);
    
    return NextResponse.json({
      error: "Webhook processing failed",
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "QStash webhook endpoint is active",
    timestamp: new Date().toISOString()
  });
}
