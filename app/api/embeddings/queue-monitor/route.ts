import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQStashQueue } from "@/lib/langChain/qstash-integration";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { getVectorStore } from "@/lib/langChain/vectorstore";
import {
  generateEmbedding,
  validateEmbedding,
} from "@/lib/langChain/embedding";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(request: NextRequest) {
  try {
    console.log("🔍 Checking embedding queue for pending items...");

    // Get all queued items from embedding_queue
    const { data: queueItems, error } = await supabase
      .from("embedding_queue")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(100); // Process up to 100 items at once

    if (error) {
      console.error("❌ Error fetching queue items:", error);
      return NextResponse.json(
        { error: "Failed to fetch queue items" },
        { status: 500 }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("✅ No items in queue to process");
      return NextResponse.json({
        message: "No items in queue",
        processed: 0,
        failed: 0,
        embeddingServerStatus: "idle",
      });
    }

    console.log(
      `📦 Found ${queueItems.length} items in queue, processing directly...`
    );

    // Process embeddings directly instead of re-queuing to QStash
    let processedCount = 0;
    let failedCount = 0;
    const vectorStore = getVectorStore();

    for (const item of queueItems) {
      try {
        console.log(`🔄 Processing ${item.content_type}:${item.content_id}...`);

        // Mark as processing
        await supabase
          .from("embedding_queue")
          .update({
            status: "processing",
            processing_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        // Generate embedding using the content text
        const embeddingResult = await generateEmbedding(
          item.content_text,
          "e5"
        );

        if (
          !embeddingResult.embedding ||
          embeddingResult.embedding.length === 0
        ) {
          throw new Error("Failed to generate embedding");
        }

        // Validate the embedding
        if (!validateEmbedding(embeddingResult.embedding, 384, "e5")) {
          throw new Error("Invalid embedding dimensions");
        }

        // Store the embedding in the embeddings table
        const { error: insertError } = await supabase.from("embeddings").upsert(
          {
            content_type: item.content_type,
            content_id: item.content_id,
            content_hash: item.content_hash,
            embedding: embeddingResult.embedding,
            embedding_e5_small: embeddingResult.embedding,
            has_e5_embedding: true,
            has_bge_embedding: false,
            content_text: item.content_text,
            embedding_model: "intfloat/e5-small",
            token_count: embeddingResult.tokenCount,
            language: "en",
            status: "completed",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "content_type,content_id",
          }
        );

        if (insertError) {
          throw insertError;
        }

        // Remove from queue
        await supabase.from("embedding_queue").delete().eq("id", item.id);

        processedCount++;
        console.log(
          `✅ Successfully processed ${item.content_type}:${item.content_id}`
        );
      } catch (error) {
        failedCount++;
        console.error(
          `❌ Error processing ${item.content_type}:${item.content_id}:`,
          error
        );

        // Update retry count and status
        const newRetryCount = item.retry_count + 1;
        const maxRetries = item.max_retries || 3;

        await supabase
          .from("embedding_queue")
          .update({
            retry_count: newRetryCount,
            status: newRetryCount >= maxRetries ? "failed" : "queued",
            error_message:
              error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
            scheduled_at:
              newRetryCount >= maxRetries
                ? item.scheduled_at
                : new Date(
                    Date.now() + newRetryCount * 5 * 60 * 1000
                  ).toISOString(), // Retry after 5 minutes per retry
          })
          .eq("id", item.id);
      }
    }

    const results = {
      successful: processedCount,
      failed: failedCount,
      results: [],
    };
    const processingMethod = "direct_processing";

    // Since we processed items directly, no need to update status to 'processing'
    // The processEmbedding function already handles status updates
    console.log(
      `✅ Direct processing completed: ${processedCount} successful, ${failedCount} failed`
    );

    return NextResponse.json({
      message: `Processed ${results.successful} items via ${processingMethod}, ${results.failed} failed`,
      processed: results.successful,
      failed: results.failed,
      total: queueItems.length,
      processingMethod,
      embeddingServerStatus: "processing",
      queueItems: queueItems.map((item) => ({
        id: item.id,
        contentType: item.content_type,
        contentId: item.content_id,
        priority: item.priority,
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    console.error("❌ Error in queue monitor:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        embeddingServerStatus: "error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // If action=process, trigger processing
    if (action === "process") {
      return await handler(request);
    }

    // Otherwise, return queue statistics
    const { data: stats, error } = await supabase
      .from("embedding_queue")
      .select("status, priority, content_type, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch queue stats" },
        { status: 500 }
      );
    }

    const statusCounts =
      stats?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const priorityCounts =
      stats?.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const contentTypeCounts =
      stats?.reduce((acc, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    // Get recent items
    const recentItems =
      stats?.slice(0, 10).map((item) => ({
        status: item.status,
        priority: item.priority,
        contentType: item.content_type,
        createdAt: item.created_at,
      })) || [];

    return NextResponse.json({
      total: stats?.length || 0,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      byContentType: contentTypeCounts,
      recentItems,
      hint: "Add ?action=process to trigger queue processing",
    });
  } catch (error) {
    console.error("Error fetching queue stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// QStash signature verification for security
// In development, signature verification is optional for local testing
if (
  !process.env.QSTASH_CURRENT_SIGNING_KEY &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    "QSTASH_CURRENT_SIGNING_KEY is missing in production - signature verification disabled"
  );
}

// Enhanced handler with better error handling for signature verification
async function enhancedHandler(request: NextRequest) {
  try {
    // Log request details for debugging
    console.log("🔍 Queue monitor request:", {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get("user-agent"),
      qstashMessageId: request.headers.get("upstash-message-id"),
      qstashRetryCount: request.headers.get("upstash-retries"),
      hasSigningKey: !!process.env.QSTASH_CURRENT_SIGNING_KEY,
      nodeEnv: process.env.NODE_ENV,
    });

    return await handler(request);
  } catch (error) {
    console.error("❌ Queue monitor handler error:", error);
    return NextResponse.json(
      {
        error: "Handler error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// For local development or missing signing key, bypass signature verification
export const POST =
  process.env.NODE_ENV === "development" ||
  !process.env.QSTASH_CURRENT_SIGNING_KEY
    ? enhancedHandler
    : verifySignatureAppRouter(enhancedHandler);

// Handle QStash retries - they may come as different HTTP methods
// QStash may retry with different HTTP methods, so we map them all to the same handler
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;

// Also handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, Upstash-Signature",
      },
    }
  );
}
