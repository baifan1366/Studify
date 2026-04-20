import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

/**
 * Backfill API: Generate embeddings for existing Q&A messages
 * 
 * This endpoint queues all existing user Q&A messages for embedding generation.
 * It creates both:
 * 1. Individual message-level embeddings (ai_qa_message) - for granular matching
 * 2. Updated session-level embeddings (ai_quick_qa_session) - now includes AI answers
 * 
 * Usage:
 * POST /api/embeddings/backfill-qa-messages
 * 
 * Query params:
 * - dryRun=true: Preview what would be queued without actually queuing
 * - limit=100: Limit number of messages to process (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const limit = parseInt(searchParams.get('limit') || '0');

    console.log('🚀 [Backfill Q&A Messages] Starting backfill process...');
    console.log(`   • Dry run: ${dryRun}`);
    console.log(`   • Limit: ${limit || 'none'}`);

    const supabase = await createAdminClient();

    // Step 1: Get current state
    const { data: currentState, error: stateError } = await supabase
      .from('ai_quick_qa_messages')
      .select('id, session_id, content', { count: 'exact', head: false })
      .eq('role', 'user')
      .gte('content', ' ') // Has content
      .limit(limit || 10000);

    if (stateError) {
      console.error('❌ Error fetching current state:', stateError);
      return NextResponse.json(
        { error: 'Failed to fetch current state', details: stateError.message },
        { status: 500 }
      );
    }

    const totalUserMessages = currentState?.length || 0;
    const uniqueSessions = new Set(currentState?.map((m: any) => m.session_id)).size;

    console.log(`📊 Current State:`);
    console.log(`   • Total user messages: ${totalUserMessages}`);
    console.log(`   • Unique sessions: ${uniqueSessions}`);

    // Step 2: Check existing embeddings
    const { data: existingEmbeddings, error: embError } = await supabase
      .from('embeddings')
      .select('content_id', { count: 'exact', head: false })
      .eq('content_type', 'ai_qa_message')
      .eq('is_deleted', false);

    const existingCount = existingEmbeddings?.length || 0;
    console.log(`   • Messages with embeddings: ${existingCount}`);
    console.log(`   • Messages to process: ${totalUserMessages - existingCount}`);

    if (dryRun) {
      // Preview mode - don't actually queue
      const { data: preview } = await supabase.rpc('extract_content_text', {
        p_content_type: 'ai_qa_message',
        p_content_id: currentState?.[0]?.id
      });

      return NextResponse.json({
        success: true,
        dryRun: true,
        stats: {
          totalUserMessages,
          uniqueSessions,
          existingEmbeddings: existingCount,
          toProcess: totalUserMessages - existingCount
        },
        preview: {
          messageId: currentState?.[0]?.id,
          extractedContent: preview?.substring(0, 200) + '...'
        },
        message: 'Dry run completed. Set dryRun=false to actually queue items.'
      });
    }

    // Step 3: Queue message-level embeddings
    console.log('\n📝 Queuing message-level embeddings...');
    
    const messagesToQueue = currentState?.filter((m: any) => {
      const hasContent = m.content && m.content.trim().length > 10;
      const notEmbedded = !existingEmbeddings?.some((e: any) => e.content_id === m.id);
      return hasContent && notEmbedded;
    }) || [];

    let queuedMessages = 0;
    let failedMessages = 0;

    // Queue in batches of 50
    const batchSize = 50;
    for (let i = 0; i < messagesToQueue.length; i += batchSize) {
      const batch = messagesToQueue.slice(i, i + batchSize);
      
      try {
        const { error: queueError } = await supabase.rpc('queue_for_embedding_batch', {
          p_items: batch.map((m: any) => ({
            content_type: 'ai_qa_message',
            content_id: m.id,
            priority: 4
          }))
        });

        if (queueError) {
          console.error(`❌ Error queuing batch ${i / batchSize + 1}:`, queueError);
          failedMessages += batch.length;
        } else {
          queuedMessages += batch.length;
          console.log(`   ✅ Queued batch ${i / batchSize + 1}: ${batch.length} messages`);
        }
      } catch (error) {
        console.error(`❌ Error queuing batch ${i / batchSize + 1}:`, error);
        failedMessages += batch.length;
      }
    }

    // Step 4: Queue session-level embeddings (updated format)
    console.log('\n📝 Queuing updated session-level embeddings...');
    
    const { data: sessions } = await supabase
      .from('ai_quick_qa_sessions')
      .select('id')
      .in('id', Array.from(new Set(currentState?.map((m: any) => m.session_id))));

    let queuedSessions = 0;
    let failedSessions = 0;

    if (sessions) {
      for (let i = 0; i < sessions.length; i += batchSize) {
        const batch = sessions.slice(i, i + batchSize);
        
        try {
          const { error: queueError } = await supabase.rpc('queue_for_embedding_batch', {
            p_items: batch.map((s: any) => ({
              content_type: 'ai_quick_qa_session',
              content_id: s.id,
              priority: 5
            }))
          });

          if (queueError) {
            console.error(`❌ Error queuing session batch ${i / batchSize + 1}:`, queueError);
            failedSessions += batch.length;
          } else {
            queuedSessions += batch.length;
            console.log(`   ✅ Queued session batch ${i / batchSize + 1}: ${batch.length} sessions`);
          }
        } catch (error) {
          console.error(`❌ Error queuing session batch ${i / batchSize + 1}:`, error);
          failedSessions += batch.length;
        }
      }
    }

    // Step 5: Get queue status
    const { data: queueStatus } = await supabase
      .from('embedding_queue')
      .select('content_type, status', { count: 'exact', head: false })
      .in('content_type', ['ai_qa_message', 'ai_quick_qa_session'])
      .eq('status', 'queued');

    const queuedByType = queueStatus?.reduce((acc: any, item: any) => {
      acc[item.content_type] = (acc[item.content_type] || 0) + 1;
      return acc;
    }, {});

    console.log('\n✅ Backfill completed!');
    console.log(`   • Messages queued: ${queuedMessages}`);
    console.log(`   • Messages failed: ${failedMessages}`);
    console.log(`   • Sessions queued: ${queuedSessions}`);
    console.log(`   • Sessions failed: ${failedSessions}`);

    return NextResponse.json({
      success: true,
      stats: {
        totalUserMessages,
        uniqueSessions,
        existingEmbeddings: existingCount,
        processed: {
          messages: {
            queued: queuedMessages,
            failed: failedMessages
          },
          sessions: {
            queued: queuedSessions,
            failed: failedSessions
          }
        },
        currentQueue: queuedByType
      },
      message: 'Backfill completed. Start the embedding processor to process the queue.',
      nextSteps: [
        'POST /api/embeddings/processor with action: "start"',
        'GET /api/embeddings/queue-monitor to monitor progress'
      ]
    });

  } catch (error) {
    console.error('❌ [Backfill Q&A Messages] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to backfill Q&A messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to start backfill process',
    description: 'This endpoint queues all existing Q&A messages for embedding generation',
    usage: {
      dryRun: 'POST /api/embeddings/backfill-qa-messages?dryRun=true',
      limited: 'POST /api/embeddings/backfill-qa-messages?limit=100',
      full: 'POST /api/embeddings/backfill-qa-messages'
    }
  });
}
