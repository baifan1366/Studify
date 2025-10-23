import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQStashQueue } from "@/lib/langChain/qstash-integration";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { getVectorStore } from "@/lib/langChain/vectorstore";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check if dual embedding columns exist in the database
async function checkDualEmbeddingSupport(): Promise<{
  supported: boolean;
  missingColumns: string[];
}> {
  try {
    // Try to query the dual embedding columns
    const { data, error } = await supabase
      .from("embeddings")
      .select("embedding_e5_small, embedding_bge_m3, has_e5_embedding, has_bge_embedding")
      .limit(1);

    if (error) {
      // Check if error is about missing columns
      const errorMessage = error.message.toLowerCase();
      const missingColumns: string[] = [];
      
      if (errorMessage.includes("embedding_e5_small")) missingColumns.push("embedding_e5_small");
      if (errorMessage.includes("embedding_bge_m3")) missingColumns.push("embedding_bge_m3");
      if (errorMessage.includes("has_e5_embedding")) missingColumns.push("has_e5_embedding");
      if (errorMessage.includes("has_bge_embedding")) missingColumns.push("has_bge_embedding");

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

async function handler(request: NextRequest) {
  try {
    console.log("🔍 Checking embedding queue for pending items...");

    // First, check if dual embedding columns exist
    const dualEmbeddingCheck = await checkDualEmbeddingSupport();
    if (!dualEmbeddingCheck.supported) {
      console.error(
        "❌ Dual embedding columns not found in database!",
        "\nMissing columns:", dualEmbeddingCheck.missingColumns,
        "\nPlease run the migration in db/function.sql to add these columns:",
        "\n- ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_e5_small vector(384);",
        "\n- ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_bge_m3 vector(1024);",
        "\n- ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_e5_embedding boolean DEFAULT false;",
        "\n- ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_bge_embedding boolean DEFAULT false;"
      );
      return NextResponse.json(
        {
          error: "Database schema not ready for dual embeddings",
          missingColumns: dualEmbeddingCheck.missingColumns,
          migrationRequired: true,
          hint: "Run the ALTER TABLE commands from db/function.sql (lines 4966-4969)"
        },
        { status: 500 }
      );
    }

    console.log("✅ Dual embedding support confirmed");

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
      `📦 Found ${queueItems.length} items in queue, processing with dual embeddings...`
    );

    // Log queue items for debugging
    console.log("Queue items to process:", queueItems.map(item => ({
      id: item.id,
      content_type: item.content_type,
      content_id: item.content_id,
      priority: item.priority,
      retry_count: item.retry_count,
      text_preview: item.content_text?.substring(0, 100) + "..."
    })));

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

        // Generate DUAL embeddings (both E5 and BGE)
        console.log(`🔄 Generating dual embeddings for ${item.content_type}:${item.content_id}...`);
        
        const { generateDualEmbedding, validateDualEmbedding } = await import("@/lib/langChain/embedding");
        const dualResult = await generateDualEmbedding(item.content_text);

        // Validate at least one embedding succeeded
        const validation = validateDualEmbedding(dualResult);
        if (!validation.hasAnyValid) {
          throw new Error("Failed to generate any valid embeddings (both E5 and BGE failed)");
        }

        console.log(`✅ Dual embedding validation: E5=${validation.e5Valid}, BGE=${validation.bgeValid}`);

        // Prepare embedding data with all available embeddings
        const embeddingData: any = {
          content_type: item.content_type,
          content_id: item.content_id,
          content_hash: item.content_hash,
          content_text: item.content_text,
          embedding_model: "dual-embedding",
          token_count: dualResult.token_count,
          language: "en",
          status: "completed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Add E5 embedding if available
        if (dualResult.e5_embedding && validation.e5Valid) {
          embeddingData.embedding = dualResult.e5_embedding; // Legacy column
          embeddingData.embedding_e5_small = dualResult.e5_embedding;
          embeddingData.has_e5_embedding = true;
        } else {
          embeddingData.has_e5_embedding = false;
        }

        // Add BGE embedding if available
        if (dualResult.bge_embedding && validation.bgeValid) {
          embeddingData.embedding_bge_m3 = dualResult.bge_embedding;
          embeddingData.has_bge_embedding = true;
          // If E5 failed, use BGE as fallback for legacy column
          if (!dualResult.e5_embedding) {
            embeddingData.embedding_model = "BAAI/bge-m3";
          }
        } else {
          embeddingData.has_bge_embedding = false;
        }

        // Check if embedding already exists for this content
        const { data: existingEmbedding } = await supabase
          .from("embeddings")
          .select("id")
          .eq("content_type", item.content_type)
          .eq("content_id", item.content_id)
          .eq("content_hash", item.content_hash)
          .single();

        let insertError;
        if (existingEmbedding) {
          // Update existing embedding
          const { error } = await supabase
            .from("embeddings")
            .update(embeddingData)
            .eq("id", existingEmbedding.id);
          insertError = error;
        } else {
          // Insert new embedding
          const { error } = await supabase
            .from("embeddings")
            .insert(embeddingData);
          insertError = error;
        }

        if (insertError) {
          console.error(`❌ Failed to store embedding in database:`, insertError);
          throw insertError;
        }

        console.log(`📏 Successfully stored ${validation.e5Valid && validation.bgeValid ? 'dual' : 'single'} embedding for ${item.content_type}:${item.content_id}`);

        // Remove from queue
        const { error: deleteError } = await supabase
          .from("embedding_queue")
          .delete()
          .eq("id", item.id);

        if (deleteError) {
          console.error(`⚠️ Warning: Could not remove item from queue:`, deleteError);
          // Don't throw here, embedding was successful
        }

        processedCount++;
        console.log(
          `✅ Successfully processed ${item.content_type}:${item.content_id} (${processedCount}/${queueItems.length})`
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

    console.log(
      `\n✅ ====== Embedding Queue Processing Complete ======`,
      `\n📈 Total items: ${queueItems.length}`,
      `\n✅ Successful: ${processedCount}`,
      `\n❌ Failed: ${failedCount}`,
      `\n🔄 Method: ${processingMethod}`,
      `\n==================================================\n`
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
