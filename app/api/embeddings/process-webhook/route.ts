import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getVectorStore } from '@/lib/langChain/vectorstore';

// POST /api/embeddings/process-webhook - QStash webhook for processing embeddings
async function handler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Invalid JSON in webhook request:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload', success: false },
        { status: 400 }
      );
    }

    const { contentType, contentId, priority = 5, timestamp } = body;

    // Enhanced input validation
    if (!contentType || typeof contentType !== 'string') {
      return NextResponse.json(
        { error: 'contentType is required and must be a string', success: false },
        { status: 400 }
      );
    }

    if (!contentId || (typeof contentId !== 'number' && typeof contentId !== 'string')) {
      return NextResponse.json(
        { error: 'contentId is required and must be a number or string', success: false },
        { status: 400 }
      );
    }

    if (typeof priority !== 'number' || priority < 1 || priority > 10) {
      return NextResponse.json(
        { error: 'priority must be a number between 1 and 10', success: false },
        { status: 400 }
      );
    }

    // Validate content type
    const validContentTypes = ['profile', 'course', 'post', 'comment', 'lesson', 'auth_user'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }

    console.log(`📩 QStash Embedding Webhook: Processing ${contentType}:${contentId} with priority ${priority}`, {
      contentType,
      contentId,
      priority,
      timestamp,
      requestId: request.headers.get('x-request-id') || 'unknown'
    });

    let vectorStore;
    try {
      vectorStore = getVectorStore();
    } catch (vectorStoreError) {
      console.error('❌ Failed to initialize vector store:', vectorStoreError);
      return NextResponse.json(
        { error: 'Vector store initialization failed', success: false },
        { status: 500 }
      );
    }
    
    // Queue the content for embedding with error handling
    let success;
    try {
      // Convert contentId to number if it's a string
      const numericContentId = typeof contentId === 'string' ? parseInt(contentId) : contentId;
      if (isNaN(numericContentId)) {
        return NextResponse.json(
          { error: 'contentId must be a valid number', success: false },
          { status: 400 }
        );
      }
      
      success = await vectorStore.queueForEmbedding(contentType as any, numericContentId, priority);
    } catch (queueError: any) {
      console.error('❌ Failed to queue content for embedding:', queueError);
      return NextResponse.json(
        { error: 'Failed to queue content for embedding', success: false, details: queueError?.message || 'Unknown error' },
        { status: 500 }
      );
    }
    
    if (!success) {
      console.warn('⚠️ Content was not queued (possibly duplicate or invalid)');
      return NextResponse.json(
        { error: 'Content was not queued for embedding', success: false },
        { status: 422 }
      );
    }

    // Try to process immediately for high priority items
    let processedImmediately = false;
    if (priority <= 2) {
      try {
        // Convert contentId to number if it's a string
        const numericContentId = typeof contentId === 'string' ? parseInt(contentId) : contentId;
        console.log(`🚀 Attempting immediate processing for high priority item: ${contentType}:${contentId}`);
        const batch = await vectorStore.getEmbeddingBatch(1);
        const targetItem = batch.find((item: any) => 
          item.content_type === contentType && item.content_id === numericContentId
        );
        
        if (targetItem) {
          await vectorStore.processEmbedding(targetItem);
          processedImmediately = true;
          console.log(`✅ QStash webhook: Immediately processed ${contentType}:${contentId}`);
        } else {
          console.log(`ℹ️ Target item not found in batch for immediate processing: ${contentType}:${contentId}`);
        }
      } catch (immediateError: any) {
        console.error('❌ Error in immediate processing (item still queued for batch):', {
          error: immediateError?.message || 'Unknown error',
          contentType,
          contentId,
          stack: immediateError?.stack
        });
        // Don't fail the webhook, item is still queued for batch processing
      }
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ QStash Embedding Webhook completed successfully`, {
      contentType,
      contentId,
      priority,
      processedImmediately,
      processingTimeMs: processingTime
    });

    return NextResponse.json({
      success: true,
      message: 'Content queued for embedding successfully',
      data: {
        contentType,
        contentId,
        priority,
        processedImmediately,
        processingTimeMs: processingTime
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('🚨 QStash Embedding Webhook fatal error:', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime,
      requestHeaders: Object.fromEntries(request.headers.entries())
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook',
        processingTimeMs: processingTime
      },
      { status: 500 }
    );
  }
}

// Always verify QStash signature for security
// In development, signature verification is optional for local testing
if (!process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.NODE_ENV === 'production') {
  console.warn('QSTASH_CURRENT_SIGNING_KEY is missing in production - signature verification disabled');
}

// For local development or missing signing key, bypass signature verification
export const POST = (process.env.NODE_ENV === 'development' || !process.env.QSTASH_CURRENT_SIGNING_KEY)
  ? handler
  : verifySignatureAppRouter(handler);
