import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log('📥 QStash Test Webhook Received');
    console.log('🕒 Timestamp:', new Date().toISOString());
    console.log('🌐 URL:', req.url);
    
    // Log headers
    const headers: { [key: string]: string } = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('📋 Headers:', headers);

    // Parse body
    const body = await req.json();
    console.log('📦 Body:', body);

    return NextResponse.json({
      success: true,
      message: "Test webhook received successfully",
      timestamp: new Date().toISOString(),
      received_data: body,
      headers: headers
    });

  } catch (error: any) {
    console.error('❌ Test webhook error:', error);
    
    return NextResponse.json({
      error: "Test webhook failed",
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "QStash test webhook endpoint is active",
    timestamp: new Date().toISOString()
  });
}
