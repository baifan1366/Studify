// API endpoint to check attachment processing status
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { getAttachmentStatistics, isAttachmentProcessed } from '@/lib/pdf-processing/pdf-processing-queue';
import { retryFailedChunks } from '@/lib/pdf-processing/pdf-embedding-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { attachmentId: attachmentIdStr } = await params;
    const attachmentId = parseInt(attachmentIdStr);

    if (isNaN(attachmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid attachment ID',
        },
        { status: 400 }
      );
    }

    // Get attachment statistics
    const stats = await getAttachmentStatistics(attachmentId);

    return NextResponse.json({
      success: true,
      attachmentId,
      isProcessed: stats.isProcessed,
      statistics: {
        totalChunks: stats.totalChunks,
        completedChunks: stats.completedChunks,
        failedChunks: stats.failedChunks,
        status: stats.status,
        progressPercentage: stats.totalChunks > 0 
          ? Math.round((stats.completedChunks / stats.totalChunks) * 100)
          : 0,
      },
    });

  } catch (error) {
    console.error('❌ Error getting attachment status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST endpoint to retry failed chunks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    // Authorize user (require tutor role)
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { attachmentId: attachmentIdStr } = await params;
    const attachmentId = parseInt(attachmentIdStr);

    if (isNaN(attachmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid attachment ID',
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Retrying failed chunks for attachment ${attachmentId}`);

    // Retry failed chunks
    const result = await retryFailedChunks(attachmentId);

    return NextResponse.json({
      success: result.success,
      message: `Retry completed: ${result.processedChunks} succeeded, ${result.failedChunks} failed`,
      statistics: {
        processedChunks: result.processedChunks,
        failedChunks: result.failedChunks,
        totalChunks: result.totalChunks,
      },
      errors: result.errors,
    });

  } catch (error) {
    console.error('❌ Error retrying failed chunks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
