import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getQStashQueue } from '@/lib/langChain/qstash-integration';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(request: NextRequest) {
  try {
    console.log('🔍 Checking embedding queue for pending items...');
    
    // Get all queued items from embedding_queue
    const { data: queueItems, error } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(100); // Process up to 100 items at once
    
    if (error) {
      console.error('❌ Error fetching queue items:', error);
      return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 });
    }
    
    if (!queueItems || queueItems.length === 0) {
      console.log('✅ No items in queue to process');
      return NextResponse.json({ 
        message: 'No items in queue',
        processed: 0,
        failed: 0
      });
    }
    
    console.log(`📦 Found ${queueItems.length} items in queue, sending to QStash...`);
    
    // Send items to QStash
    const qstash = getQStashQueue();
    const results = await qstash.queueBatch(
      queueItems.map(item => ({
        contentType: item.content_type,
        contentId: item.content_id,
        priority: item.priority
      }))
    );
    
    console.log(`🚀 QStash results: ${results.successful} successful, ${results.failed} failed`);
    
    // Update successfully processed items status in database
    const processedIds = queueItems
      .filter((_, index) => {
        const result = results.results[index];
        return result.status === 'fulfilled' && result.value.success;
      })
      .map(item => item.id);
    
    if (processedIds.length > 0) {
      const { error: updateError } = await supabase
        .from('embedding_queue')
        .update({ 
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', processedIds);
        
      if (updateError) {
        console.error('❌ Error updating processed items:', updateError);
      } else {
        console.log(`✅ Updated ${processedIds.length} items to processing status`);
      }
    }
    
    return NextResponse.json({
      message: `Processed ${results.successful} items via QStash, ${results.failed} failed`,
      processed: results.successful,
      failed: results.failed,
      total: queueItems.length,
      queueItems: queueItems.map(item => ({
        id: item.id,
        contentType: item.content_type,
        contentId: item.content_id,
        priority: item.priority,
        createdAt: item.created_at
      }))
    });
    
  } catch (error) {
    console.error('❌ Error in queue monitor:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get queue statistics
    const { data: stats, error } = await supabase
      .from('embedding_queue')
      .select('status, priority, content_type, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
    }
    
    const statusCounts = stats?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const priorityCounts = stats?.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const contentTypeCounts = stats?.reduce((acc, item) => {
      acc[item.content_type] = (acc[item.content_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    // Get recent items
    const recentItems = stats?.slice(0, 10).map(item => ({
      status: item.status,
      priority: item.priority,
      contentType: item.content_type,
      createdAt: item.created_at
    })) || [];
    
    return NextResponse.json({
      total: stats?.length || 0,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      byContentType: contentTypeCounts,
      recentItems
    });
    
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// QStash signature verification for security
// In development, signature verification is optional for local testing
if (!process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.NEXT_PUBLIC_NODE_ENV === 'production') {
  throw new Error('QSTASH_CURRENT_SIGNING_KEY is required in production');
}

// For local development with QStash dev server, bypass signature verification
export const POST = process.env.NEXT_PUBLIC_NODE_ENV === 'development'
  ? handler
  : process.env.QSTASH_CURRENT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : handler;
