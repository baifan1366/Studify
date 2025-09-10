import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getVectorStore } from '@/lib/langChain/vectorstore';

// POST /api/embeddings/process-webhook - QStash webhook for processing embeddings
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentType, contentId, priority = 5 } = body;

    // Validate input
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'contentType and contentId are required' },
        { status: 400 }
      );
    }

    console.log(`QStash webhook: Processing ${contentType}:${contentId} with priority ${priority}`);

    const vectorStore = getVectorStore();
    
    // Queue the content for embedding
    const success = await vectorStore.queueForEmbedding(contentType, contentId, priority);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to queue content for embedding' },
        { status: 500 }
      );
    }

    // Try to process immediately for high priority items
    if (priority <= 2) {
      try {
        const batch = await vectorStore.getEmbeddingBatch(1);
        const targetItem = batch.find(item => 
          item.content_type === contentType && item.content_id === contentId
        );
        
        if (targetItem) {
          await vectorStore.processEmbedding(targetItem);
          console.log(`QStash webhook: Immediately processed ${contentType}:${contentId}`);
        }
      } catch (error) {
        console.error('Error in immediate processing:', error);
        // Don't fail the webhook, item is still queued for batch processing
      }
    }

    return NextResponse.json({
      message: 'Content queued for embedding successfully',
      contentType,
      contentId,
      priority,
      processedImmediately: priority <= 2
    });

  } catch (error) {
    console.error('QStash webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify QStash signature with environment variables
export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY 
  ? verifySignatureAppRouter(handler)
  : handler;
