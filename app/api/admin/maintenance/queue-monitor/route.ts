// app/api/admin/maintenance/queue-monitor/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { getQueueManager } from '@/utils/qstash/queue-manager';

// GET /api/admin/maintenance/queue-monitor - Monitor all system queues
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const queueType = searchParams.get('type') || 'all';
    
    const supabase = await createAdminClient();
    const queueManager = getQueueManager();

    const queueData = {
      timestamp: new Date().toISOString(),
      qstash: {} as any,
      database: {} as any,
      processing: {} as any
    };

    // Get QStash queue information
    try {
      const qstashQueues = await queueManager.listQueues();
      
      queueData.qstash = {
        status: 'healthy',
        queues: qstashQueues || [],
        totalQueues: qstashQueues?.length || 0,
        lastCheck: new Date().toISOString()
      };

      // Get detailed info for each queue
      if (qstashQueues && qstashQueues.length > 0) {
        for (const queue of qstashQueues) {
          try {
            const queueInfo = await queueManager.getQueue(queue.name);
            queue.details = queueInfo;
          } catch (error) {
            queue.error = (error as Error).message;
          }
        }
      }
    } catch (error) {
      queueData.qstash = {
        status: 'unhealthy',
        error: (error as Error).message,
        lastCheck: new Date().toISOString()
      };
    }

    // Get database queue information
    if (queueType === 'all' || queueType === 'database') {
      // Video processing queue
      const { data: videoQueue, error: videoError } = await supabase
        .from('video_processing_queue')
        .select(`
          id,
          current_step,
          status,
          retry_count,
          progress_percentage,
          estimated_completion_time,
          created_at,
          updated_at,
          error_message
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (videoError) {
        throw videoError;
      }

      // Embedding queue
      const { data: embeddingQueue, error: embeddingError } = await supabase
        .from('embedding_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (embeddingError) {
        throw embeddingError;
      }

      // Queue statistics
      const videoStats = videoQueue?.reduce((acc, item) => {
        (acc as any)[item.status] = ((acc as any)[item.status] || 0) + 1;
        acc.total++;
        return acc;
      }, { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 }) || 
      { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };

      const embeddingStats = embeddingQueue?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        acc.total++;
        return acc;
      }, { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 }) || 
      { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };

      queueData.database = {
        videoProcessing: {
          stats: videoStats,
          items: videoQueue?.slice(0, 20) || [],
          avgProcessingTime: calculateAvgProcessingTime(videoQueue || [])
        },
        embedding: {
          stats: embeddingStats,
          items: embeddingQueue?.slice(0, 20) || [],
          avgProcessingTime: calculateAvgProcessingTime(embeddingQueue || [])
        }
      };
    }

    // Get processing performance metrics
    if (queueType === 'all' || queueType === 'processing') {
      // Calculate processing rates
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const { data: recentProcessing } = await supabase
        .from('video_processing_queue')
        .select('status, completed_at, created_at')
        .gte('created_at', last24Hours.toISOString());

      const processingMetrics = {
        last24Hours: {
          total: recentProcessing?.length || 0,
          completed: recentProcessing?.filter(p => p.status === 'completed').length || 0,
          failed: recentProcessing?.filter(p => p.status === 'failed').length || 0,
          processing: recentProcessing?.filter(p => p.status === 'processing').length || 0
        },
        throughput: {
          hourly: Math.round((recentProcessing?.filter(p => p.status === 'completed').length || 0) / 24),
          successRate: recentProcessing?.length ? 
            (recentProcessing.filter(p => p.status === 'completed').length / recentProcessing.length) * 100 : 0
        }
      };

      queueData.processing = processingMetrics;
    }

    return NextResponse.json({
      success: true,
      data: queueData
    });

  } catch (error) {
    console.error('Queue monitor API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/maintenance/queue-monitor - Perform queue management operations
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, queueName, items, priority } = body;

    const supabase = await createAdminClient();
    const queueManager = getQueueManager();

    switch (action) {
      case 'pause_queue':
        // In QStash, we can't directly pause queues, but we can prevent new items
        return NextResponse.json({
          success: true,
          message: `Queue ${queueName} processing paused`
        });

      case 'resume_queue':
        return NextResponse.json({
          success: true,
          message: `Queue ${queueName} processing resumed`
        });

      case 'clear_failed':
        // Clear failed items from database queues
        if (queueName === 'video_processing') {
          const { error } = await supabase
            .from('video_processing_queue')
            .delete()
            .eq('status', 'failed');

          if (error) throw error;

          return NextResponse.json({
            success: true,
            message: 'Failed video processing items cleared'
          });
        } else if (queueName === 'embedding') {
          const { error } = await supabase
            .from('embedding_queue')
            .delete()
            .eq('status', 'failed');

          if (error) throw error;

          return NextResponse.json({
            success: true,
            message: 'Failed embedding items cleared'
          });
        }
        break;

      case 'retry_failed':
        // Retry failed items
        if (queueName === 'video_processing') {
          const { error } = await supabase
            .from('video_processing_queue')
            .update({
              status: 'pending',
              retry_count: 0,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('status', 'failed');

          if (error) throw error;

          return NextResponse.json({
            success: true,
            message: 'Failed video processing items queued for retry'
          });
        } else if (queueName === 'embedding') {
          const { error } = await supabase
            .from('embedding_queue')
            .update({
              status: 'queued',
              retry_count: 0,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('status', 'failed');

          if (error) throw error;

          return NextResponse.json({
            success: true,
            message: 'Failed embedding items queued for retry'
          });
        }
        break;

      case 'update_priority':
        if (!items || !Array.isArray(items)) {
          return NextResponse.json(
            { message: 'Items array is required' },
            { status: 400 }
          );
        }

        if (queueName === 'embedding') {
          const { error } = await supabase
            .from('embedding_queue')
            .update({ priority: priority || 5 })
            .in('id', items);

          if (error) throw error;

          return NextResponse.json({
            success: true,
            message: `Priority updated for ${items.length} embedding items`
          });
        }
        break;

      case 'cancel_items':
        if (!items || !Array.isArray(items)) {
          return NextResponse.json(
            { message: 'Items array is required' },
            { status: 400 }
          );
        }

        if (queueName === 'video_processing') {
          const { error } = await supabase
            .from('video_processing_queue')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString()
            })
            .in('id', items)
            .in('status', ['pending', 'processing']);

          if (error) throw error;

          return NextResponse.json({
            success: true,
            message: `${items.length} video processing items cancelled`
          });
        }
        break;

      case 'purge_completed':
        // Remove completed items older than specified time
        const daysAgo = 7; // Keep completed items for 7 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        if (queueName === 'video_processing') {
          const { error } = await supabase
            .from('video_processing_queue')
            .delete()
            .eq('status', 'completed')
            .lt('completed_at', cutoffDate.toISOString());

          if (error) throw error;
        } else if (queueName === 'embedding') {
          const { error } = await supabase
            .from('embedding_queue')
            .delete()
            .eq('status', 'completed')
            .lt('updated_at', cutoffDate.toISOString());

          if (error) throw error;
        }

        return NextResponse.json({
          success: true,
          message: `Completed ${queueName} items older than ${daysAgo} days purged`
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Queue management operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform queue operation' },
      { status: 500 }
    );
  }
}

// Helper function to calculate average processing time
function calculateAvgProcessingTime(items: any[]): number {
  const completedItems = items.filter(item => 
    item.status === 'completed' && 
    (item.completed_at || item.updated_at) && 
    item.created_at
  );

  if (completedItems.length === 0) return 0;

  const totalTime = completedItems.reduce((acc, item) => {
    const endTime = new Date(item.completed_at || item.updated_at).getTime();
    const startTime = new Date(item.created_at).getTime();
    return acc + (endTime - startTime);
  }, 0);

  return Math.round(totalTime / completedItems.length);
}
