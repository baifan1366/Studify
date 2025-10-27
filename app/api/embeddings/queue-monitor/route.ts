import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

// Check if dual embedding columns exist in the database
async function checkDualEmbeddingSupport(): Promise<{
  supported: boolean;
  missingColumns: string[];
}> {
  try {
    const supabase = await createAdminClient();
    // Try to query the dual embedding columns
    const { error } = await supabase
      .from("embeddings")
      .select(
        "embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding"
      )
      .limit(1);

    if (error) {
      // Check if error is about missing columns
      const errorMessage = error.message.toLowerCase();
      const missingColumns: string[] = [];

      if (errorMessage.includes("embedding_e5_small"))
        missingColumns.push("embedding_e5_small");
      if (errorMessage.includes("embedding_bge_m3"))
        missingColumns.push("embedding_bge_m3");
      if (errorMessage.includes("has_e5_embedding"))
        missingColumns.push("has_e5_embedding");
      if (errorMessage.includes("has_bge_embedding"))
        missingColumns.push("has_bge_embedding");

      if (missingColumns.length > 0) {
        return { supported: false, missingColumns };
      }
    }

    return { supported: true, missingColumns: [] };
  } catch (error) {
    console.error("Error checking dual embedding support:", error);
    return { supported: false, missingColumns: ["unknown"] };
  }
}

async function handler(_request: NextRequest) {
  try {
    console.log("🔍 Queue Monitor: Checking embedding queue...");

    const supabase = await createAdminClient();

    // Check dual embedding support
    const dualEmbeddingCheck = await checkDualEmbeddingSupport();
    if (!dualEmbeddingCheck.supported) {
      console.error("❌ Dual embedding columns not found in database!");
      return NextResponse.json(
        {
          error: "Database schema not ready for dual embeddings",
          missingColumns: dualEmbeddingCheck.missingColumns,
        },
        { status: 500 }
      );
    }

    // Get queued items (limit to 50 per run to avoid timeout)
    const { data: queueItems, error } = await supabase
      .from("embedding_queue")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString())
      .lt("retry_count", 3) // Only process items that haven't exceeded max retries
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("❌ Error fetching queue items:", error);
      return NextResponse.json(
        { error: "Failed to fetch queue items" },
        { status: 500 }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("✅ No items in queue to process");

      // Perform maintenance tasks when queue is empty
      await performMaintenance();

      return NextResponse.json({
        message: "No items in queue",
        processed: 0,
        failed: 0,
      });
    }

    console.log(`📦 Processing ${queueItems.length} items directly...`);

    // Process items directly (no QStash queue needed)
    let processedCount = 0;
    let failedCount = 0;

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

        // Generate dual embeddings
        const { generateDualEmbedding, validateDualEmbedding } = await import(
          "@/lib/langChain/embedding"
        );
        const dualResult = await generateDualEmbedding(item.content_text);

        // Validate embeddings
        const validation = validateDualEmbedding(dualResult);
        if (!validation.hasAnyValid) {
          throw new Error("Failed to generate any valid embeddings");
        }

        console.log(
          `✅ Generated embeddings: E5=${validation.e5Valid}, BGE=${validation.bgeValid}`
        );

        // Prepare embedding data
        const embeddingData: any = {
          content_type: item.content_type,
          content_id: item.content_id,
          content_hash: item.content_hash,
          content_text: item.content_text,
          embedding_model: "dual-embedding",
          token_count: dualResult.token_count,
          language: "en",
          status: "completed",
          updated_at: new Date().toISOString(),
        };

        // Add E5 embedding
        if (dualResult.e5_embedding && validation.e5Valid) {
          embeddingData.embedding = dualResult.e5_embedding;
          embeddingData.embedding_e5_small = dualResult.e5_embedding;
          embeddingData.has_e5_embedding = true;
        } else {
          embeddingData.has_e5_embedding = false;
        }

        // Add BGE embedding
        if (dualResult.bge_embedding && validation.bgeValid) {
          embeddingData.embedding_bge_m3 = dualResult.bge_embedding;
          embeddingData.has_bge_embedding = true;
        } else {
          embeddingData.has_bge_embedding = false;
        }

        // Upsert embedding
        const { error: upsertError } = await supabase
          .from("embeddings")
          .upsert(embeddingData, {
            onConflict: "content_type,content_id",
          });

        if (upsertError) {
          throw upsertError;
        }

        // Remove from queue
        await supabase.from("embedding_queue").delete().eq("id", item.id);

        processedCount++;
        console.log(
          `✅ Processed ${item.content_type}:${item.content_id} (${processedCount}/${queueItems.length})`
        );
      } catch (error) {
        failedCount++;
        console.error(
          `❌ Error processing ${item.content_type}:${item.content_id}:`,
          error
        );

        // Update retry count
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
                  ).toISOString(),
          })
          .eq("id", item.id);
      }
    }

    console.log(
      `✅ Processing complete: ${processedCount} processed, ${failedCount} failed`
    );

    return NextResponse.json({
      message: "Processing complete",
      processed: processedCount,
      failed: failedCount,
      total: queueItems.length,
    });
  } catch (error) {
    console.error("❌ Error in queue monitor:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Maintenance tasks (cleanup old items, retry failed items)
async function performMaintenance() {
  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Delete old completed items (shouldn't be any, but just in case)
    await supabase
      .from("embedding_queue")
      .delete()
      .eq("status", "completed")
      .lt("updated_at", sevenDaysAgo.toISOString());

    // Delete very old failed items
    await supabase
      .from("embedding_queue")
      .delete()
      .eq("status", "failed")
      .lt("updated_at", thirtyDaysAgo.toISOString());

    // Reset failed items that haven't exceeded max retries (weekly retry)
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Only retry on Sundays at 3 AM (approximately)
    if (dayOfWeek === 0 && hour === 3) {
      await supabase
        .from("embedding_queue")
        .update({
          status: "queued",
          scheduled_at: now.toISOString(),
          error_message: null,
          updated_at: now.toISOString(),
        })
        .eq("status", "failed")
        .lt("retry_count", 3);

      console.log("🔄 Weekly retry: Reset failed items");
    }

    console.log("🧹 Maintenance tasks completed");
  } catch (error) {
    console.error("⚠️ Maintenance error:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
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
