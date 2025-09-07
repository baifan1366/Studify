import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { 
  getEmbeddingProcessor, 
  startEmbeddingProcessor, 
  stopEmbeddingProcessor, 
  getProcessorStatus,
  queueAllExistingContent 
} from '@/lib/langChain/embedding-processor';

// GET /api/embeddings/processor - Get processor status
export async function GET(request: NextRequest) {
  try {
    // Authorize user (admin can view processor status)
    // const user = await authorize('admin');

    const status = await getProcessorStatus();

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting processor status:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/embeddings/processor - Control processor (start/stop) or queue existing content
export async function POST(request: NextRequest) {
  try {
    // Authorize user (admin can control processor)
    //const user = await authorize('admin');

    const body = await request.json();
    const { action, options } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start':
        await startEmbeddingProcessor();
        return NextResponse.json({
          message: 'Embedding processor started successfully'
        });

      case 'stop':
        await stopEmbeddingProcessor();
        return NextResponse.json({
          message: 'Embedding processor stopped successfully'
        });

      case 'queue_existing':
        const results = await queueAllExistingContent();
        return NextResponse.json({
          message: 'Existing content queued for embedding',
          results
        });

      case 'process_immediate':
        const { contentType, contentId } = options || {};
        if (!contentType || !contentId) {
          return NextResponse.json(
            { error: 'contentType and contentId are required for immediate processing' },
            { status: 400 }
          );
        }

        const processor = getEmbeddingProcessor();
        const success = await processor.processImmediately(contentType, contentId);
        
        return NextResponse.json({
          message: success ? 'Content processed successfully' : 'Failed to process content',
          success,
          contentType,
          contentId
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: start, stop, queue_existing, process_immediate' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error controlling processor:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
