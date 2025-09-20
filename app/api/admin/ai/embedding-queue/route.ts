// app/api/admin/ai/embedding-queue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/ai/embedding-queue - Get embedding queue status and analytics
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createAdminClient();

    // Get queue statistics
    const { data: queueStats } = await supabase
      .from('embedding_queue')
      .select('status')
      .not('status', 'eq', null);

    const stats = queueStats?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get recent queue items
    let query = supabase
      .from('embedding_queue')
      .select(`
        *,
        embeddings:content_id (
          id,
          status,
          content_type,
          word_count,
          has_e5_embedding,
          has_bge_embedding,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: queueItems, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch embedding queue data' },
        { status: 500 }
      );
    }

    // Get processing performance metrics
    const { data: performanceData } = await supabase
      .from('embedding_queue')
      .select('created_at, updated_at, status')
      .neq('status', 'queued')
      .order('updated_at', { ascending: false })
      .limit(100);

    const avgProcessingTime = performanceData && performanceData.length > 0 
      ? performanceData.reduce((acc, item) => {
          if (item.updated_at && item.created_at) {
            const processingTime = new Date(item.updated_at).getTime() - new Date(item.created_at).getTime();
            return acc + processingTime;
          }
          return acc;
        }, 0) / performanceData.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: queueStats?.length || 0,
          queued: stats.queued || 0,
          processing: stats.processing || 0,
          completed: stats.completed || 0,
          failed: stats.failed || 0,
          avgProcessingTimeMs: Math.round(avgProcessingTime || 0)
        },
        items: queueItems || [],
        pagination: {
          limit,
          offset,
          total: queueStats?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Embedding queue API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ai/embedding-queue - Queue management operations
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, items, priority } = body;

    const supabase = await createAdminClient();

    switch (action) {
      case 'retry_failed':
        // Retry failed items
        const { error: retryError } = await supabase
          .from('embedding_queue')
          .update({
            status: 'queued',
            retry_count: 0,
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('status', 'failed');

        if (retryError) {
          throw retryError;
        }

        return NextResponse.json({
          success: true,
          message: 'Failed items queued for retry'
        });

      case 'clear_completed':
        // Remove completed items older than 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { error: clearError } = await supabase
          .from('embedding_queue')
          .delete()
          .eq('status', 'completed')
          .lt('updated_at', weekAgo.toISOString());

        if (clearError) {
          throw clearError;
        }

        return NextResponse.json({
          success: true,
          message: 'Completed items cleared'
        });

      case 'update_priority':
        if (!items || !Array.isArray(items)) {
          return NextResponse.json(
            { message: 'Items array is required for priority update' },
            { status: 400 }
          );
        }

        const { error: priorityError } = await supabase
          .from('embedding_queue')
          .update({ priority: priority || 5 })
          .in('id', items);

        if (priorityError) {
          throw priorityError;
        }

        return NextResponse.json({
          success: true,
          message: `Priority updated for ${items.length} items`
        });

      case 'reprocess_content':
        if (!items || !Array.isArray(items)) {
          return NextResponse.json(
            { message: 'Items array is required for reprocessing' },
            { status: 400 }
          );
        }

        // Mark items for reprocessing
        const { error: reprocessError } = await supabase
          .from('embedding_queue')
          .update({
            status: 'queued',
            retry_count: 0,
            error_message: null,
            updated_at: new Date().toISOString(),
            priority: 8 // High priority for reprocessing
          })
          .in('id', items);

        if (reprocessError) {
          throw reprocessError;
        }

        return NextResponse.json({
          success: true,
          message: `${items.length} items queued for reprocessing`
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Embedding queue operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform queue operation' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ai/embedding-queue - Delete specific queue items
export async function DELETE(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const items = searchParams.get('items')?.split(',') || [];
    const clearAll = searchParams.get('clear_all') === 'true';

    if (!clearAll && items.length === 0) {
      return NextResponse.json(
        { message: 'Items to delete must be specified' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    if (clearAll) {
      // Clear all failed and completed items
      const { error } = await supabase
        .from('embedding_queue')
        .delete()
        .in('status', ['failed', 'completed']);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'All failed and completed items cleared'
      });
    } else {
      // Delete specific items
      const { error } = await supabase
        .from('embedding_queue')
        .delete()
        .in('id', items.map(id => parseInt(id)));

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: `${items.length} items deleted`
      });
    }

  } catch (error) {
    console.error('Delete queue items error:', error);
    return NextResponse.json(
      { message: 'Failed to delete queue items' },
      { status: 500 }
    );
  }
}
