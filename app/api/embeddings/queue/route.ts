import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { queueContentForEmbedding, getVectorStore, CONTENT_TYPES } from '@/lib/langChain/vectorstore';

// Helper function to authorize multiple roles
async function authorizeMultipleRoles(roles: ('student' | 'tutor' | 'admin')[]) {
  for (const role of roles) {
    const result = await authorize(role);
    if (!(result instanceof NextResponse)) {
      return result; // Success
    }
  }
  return NextResponse.json(
    { error: `Unauthorized: One of these roles required: ${roles.join(', ')}` },
    { status: 401 }
  );
}

// POST /api/embeddings/queue - Queue content for embedding
export async function POST(request: NextRequest) {
  try {
    // Authorize user (admin or tutor can queue content)
    const user = await authorizeMultipleRoles(['admin', 'tutor']);
    
    if (user instanceof NextResponse) {
      return user;
    }

    const body = await request.json();
    const { contentType, contentId, priority = 5 } = body;

    // Validate input
    if (!contentType || !Object.values(CONTENT_TYPES).includes(contentType)) {
      return NextResponse.json(
        { error: 'Valid contentType is required' },
        { status: 400 }
      );
    }

    if (!contentId || typeof contentId !== 'number') {
      return NextResponse.json(
        { error: 'contentId is required and must be a number' },
        { status: 400 }
      );
    }

    if (priority && (typeof priority !== 'number' || priority < 1 || priority > 10)) {
      return NextResponse.json(
        { error: 'priority must be a number between 1 and 10' },
        { status: 400 }
      );
    }

    // Queue content for embedding
    const success = await queueContentForEmbedding(contentType, contentId, priority);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to queue content for embedding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Content queued for embedding successfully',
      contentType,
      contentId,
      priority
    });

  } catch (error) {
    console.error('Error queuing content for embedding:', error);
    
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

// GET /api/embeddings/queue - Get queue status
export async function GET(request: NextRequest) {
  try {
    // Authorize user (admin can view queue status)
    const user = await authorize('admin');
    
    if (user instanceof NextResponse) {
      return user;
    }

    const vectorStore = getVectorStore();
    
    // Get queue status
    const queueStatus = await vectorStore.getQueueStatus();
    
    // Get embedding statistics
    const embeddingStats = await vectorStore.getEmbeddingStats();

    return NextResponse.json({
      queue: queueStatus,
      embeddings: embeddingStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    
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
