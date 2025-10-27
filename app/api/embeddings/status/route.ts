import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

/**
 * Get comprehensive status of the embedding queue system
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    // Get queue statistics
    const { data: queueItems, error: queueError } = await supabase
      .from("embedding_queue")
      .select("status, priority, content_type, retry_count, created_at, error_message");

    if (queueError) {
      return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      total: queueItems?.length || 0,
      byStatus: {} as Record<string, number>,
      byContentType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      avgRetryCount: 0,
      oldestItem: null as string | null,
      newestItem: null as string | null,
      errorSummary: {} as Record<string, number>,
    };

    queueItems?.forEach((item) => {
      // Count by status
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;

      // Count by content type
      stats.byContentType[item.content_type] = (stats.byContentType[item.content_type] || 0) + 1;

      // Count by priority
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;

      // Track errors
      if (item.error_message) {
        const errorKey = item.error_message.substring(0, 50);
        stats.errorSummary[errorKey] = (stats.errorSummary[errorKey] || 0) + 1;
      }
    });

    // Calculate average retry count
    const totalRetries = queueItems?.reduce((sum, item) => sum + item.retry_count, 0) || 0;
    stats.avgRetryCount = queueItems?.length ? totalRetries / queueItems.length : 0;

    // Find oldest and newest items
    if (queueItems && queueItems.length > 0) {
      const sorted = [...queueItems].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      stats.oldestItem = sorted[0].created_at;
      stats.newestItem = sorted[sorted.length - 1].created_at;
    }

    // Get recent items
    const { data: recentItems } = await supabase
      .from("embedding_queue")
      .select("id, content_type, content_id, status, retry_count, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Get embeddings statistics
    const { data: embeddingStats } = await supabase
      .from("embeddings")
      .select("status, has_e5_embedding, has_bge_embedding")
      .limit(1000);

    const embeddingsSummary = {
      total: embeddingStats?.length || 0,
      completed: embeddingStats?.filter(e => e.status === "completed").length || 0,
      withE5: embeddingStats?.filter(e => e.has_e5_embedding).length || 0,
      withBGE: embeddingStats?.filter(e => e.has_bge_embedding).length || 0,
      withBoth: embeddingStats?.filter(e => e.has_e5_embedding && e.has_bge_embedding).length || 0,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      queue: stats,
      embeddings: embeddingsSummary,
      recentItems: recentItems?.map(item => ({
        id: item.id,
        contentType: item.content_type,
        contentId: item.content_id,
        status: item.status,
        retryCount: item.retry_count,
        hasError: !!item.error_message,
        errorPreview: item.error_message?.substring(0, 60),
        age: Math.floor((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60), // minutes
      })),
      health: {
        queueHealthy: (stats.byStatus["queued"] || 0) < 100, // Alert if more than 100 queued
        processingStuck: (stats.byStatus["processing"] || 0) > 10, // Alert if more than 10 processing
        highFailureRate: (stats.byStatus["failed"] || 0) / stats.total > 0.1, // Alert if >10% failed
      },
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
