import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(_request: NextRequest) {
  try {
    console.log("🔄 Processing embedding queue batch...");

    const supabase = await createAdminClient();
    // Get batch of queued items (10 at a time for better control)
    const { data: queueItems, error } = await supabase
      .from("embedding_queue")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString())
      .lt("retry_count", supabase.rpc("max_retries"))
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("❌ Error fetching queue items:", error);
      return NextResponse.json({ error: "Failed to fetch queue items" }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("✅ No items in queue to process");
      return NextResponse.json({ message: "No items in queue", processed: 0 });
    }

    console.log(`📦 Processing ${queueItems.length} items...`);

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
        const { generateDualEmbedding, validateDualEmbedding } = await import("@/lib/langChain/embedding");
        const dualResult = await generateDualEmbedding(item.content_text);

        // Validate embeddings
        const validation = validateDualEmbedding(dualResult);
        if (!validation.hasAnyValid) {
          throw new Error("Failed to generate any valid embeddings");
        }

        console.log(`✅ Generated embeddings: E5=${validation.e5Valid}, BGE=${validation.bgeValid}`);

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
        console.log(`✅ Processed ${item.content_type}:${item.content_id}`);
      } catch (error) {
        failedCount++;
        console.error(`❌ Error processing ${item.content_type}:${item.content_id}:`, error);

        // Update retry count
        const newRetryCount = item.retry_count + 1;
        const maxRetries = item.max_retries || 3;

        await supabase
          .from("embedding_queue")
          .update({
            retry_count: newRetryCount,
            status: newRetryCount >= maxRetries ? "failed" : "queued",
            error_message: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
            scheduled_at: newRetryCount >= maxRetries 
              ? item.scheduled_at 
              : new Date(Date.now() + newRetryCount * 5 * 60 * 1000).toISOString(),
          })
          .eq("id", item.id);
      }
    }

    console.log(`✅ Batch complete: ${processedCount} processed, ${failedCount} failed`);

    return NextResponse.json({
      message: "Batch processed",
      processed: processedCount,
      failed: failedCount,
      total: queueItems.length,
    });
  } catch (error) {
    console.error("❌ Error in embedding processor:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Export with signature verification
export const POST = process.env.NODE_ENV === "development" || !process.env.QSTASH_CURRENT_SIGNING_KEY
  ? handler
  : verifySignatureAppRouter(handler);
