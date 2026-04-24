// API endpoint to check PDF processing status
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { getJobStatus } from '@/lib/pdf-processing/pdf-processing-queue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job ID is required',
        },
        { status: 400 }
      );
    }

    // Get job status
    const job = await getJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        attachmentId: job.attachmentId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        error: job.error,
        startedAt: job.startedAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Error getting job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
