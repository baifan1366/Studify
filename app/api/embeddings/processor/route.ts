import { NextRequest, NextResponse } from 'next/server';
import { 
  getEmbeddingProcessor, 
  startEmbeddingProcessor, 
  stopEmbeddingProcessor, 
  getProcessorStatus 
} from '@/lib/langChain/embedding-processor';

// GET /api/embeddings/processor - Get processor status
export async function GET(request: NextRequest) {
  try {
    const status = await getProcessorStatus();
    
    return NextResponse.json({
      success: true,
      status,
      message: status.isRunning ? 'Processor is running' : 'Processor is stopped'
    });
  } catch (error) {
    console.error('Error getting processor status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get processor status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/embeddings/processor - Start/stop processor or trigger batch processing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        await startEmbeddingProcessor();
        const startStatus = await getProcessorStatus();
        console.log('🚀 Embedding processor started for background processing');
        return NextResponse.json({
          success: true,
          message: 'Embedding processor started - will process queued items every 5 seconds',
          status: startStatus
        });

      case 'stop':
        await stopEmbeddingProcessor();
        const stopStatus = await getProcessorStatus();
        console.log('⏹️ Embedding processor stopped');
        return NextResponse.json({
          success: true,
          message: 'Embedding processor stopped',
          status: stopStatus
        });

      case 'process_batch':
        const processor = getEmbeddingProcessor();
        console.log('🔄 Manually triggering batch processing...');
        
        // Access the private processBatch method
        await (processor as any).processBatch();
        
        return NextResponse.json({
          success: true,
          message: 'Manual batch processing completed'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, or process_batch' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in processor endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
