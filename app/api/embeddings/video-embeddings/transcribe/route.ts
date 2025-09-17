import { NextResponse } from "next/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { authorize } from "@/utils/auth/server-guard";
import { z } from "zod";

// Validation schema for the request body
const TranscribeRequestSchema = z.object({
  fileUrl: z.string().url("Invalid file URL"),
  attachmentId: z.string().min(1, "Attachment ID is required"),
});

export async function POST(req: Request) {
  try {
    // Authorize the request - require tutor role
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = TranscribeRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { fileUrl, attachmentId } = validation.data;

    // Get the base URL for the processing endpoint
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const processingEndpoint = `${baseUrl}/api/embeddings/video-embeddings/process-transcribe`;

    console.log('Queueing transcription job for:', fileUrl);
    console.log('Processing endpoint:', processingEndpoint);

    // Publish job to QStash with retry configuration
    const qstashResponse = await qstashClient.publish({
      url: processingEndpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileUrl,
        attachmentId,
        userId: authResult.payload.sub,
        timestamp: new Date().toISOString(),
      }),
      // QStash retry configuration
      retries: 3, // Retry up to 3 times
      delay: "30s", // Initial delay of 30 seconds
      // Exponential backoff: 30s, 60s, 120s
    });

    console.log('QStash job published successfully:', qstashResponse);

    return NextResponse.json({
      message: "Transcription task queued successfully",
      jobId: qstashResponse.messageId,
      status: "queued",
      estimatedProcessingTime: "2-5 minutes",
    }, { status: 202 });

  } catch (error: any) {
    console.error('Error queueing transcription job:', error);
    
    // Handle specific QStash errors
    if (error.message?.includes('QStash')) {
      return NextResponse.json({
        error: "Failed to queue transcription job",
        details: "QStash service unavailable",
      }, { status: 503 });
    }

    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
    }, { status: 500 });
  }
}
