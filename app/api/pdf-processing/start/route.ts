// API endpoint to start PDF processing
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { startPDFProcessing } from '@/lib/pdf-processing/pdf-processing-queue';
import { z } from 'zod';

const startProcessingSchema = z.object({
  attachmentId: z.number().int().positive(),
  options: z.object({
    chunkSize: z.number().int().positive().optional(),
    chunkOverlap: z.number().int().positive().optional(),
    extractByPage: z.boolean().optional(),
    batchSize: z.number().int().positive().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user (require tutor role or higher)
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = startProcessingSchema.parse(body);

    const { attachmentId, options } = validatedData;

    console.log(`📄 Starting PDF processing for attachment ${attachmentId}`);

    // Start processing
    const result = await startPDFProcessing(attachmentId, options);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to start PDF processing',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: 'PDF processing started successfully',
    });

  } catch (error) {
    console.error('❌ PDF processing start error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if processing is available
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return NextResponse.json({
      success: true,
      available: true,
      supportedFormats: ['pdf'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      features: {
        textExtraction: true,
        embeddingGeneration: true,
        semanticSearch: true,
      },
    });

  } catch (error) {
    console.error('❌ Error checking PDF processing availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check availability',
      },
      { status: 500 }
    );
  }
}
