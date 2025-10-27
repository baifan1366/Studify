import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

/**
 * Manual trigger endpoint for testing embedding processing
 * Call this to immediately process the queue without waiting for the schedule
 */
export async function POST(_request: NextRequest) {
  try {
    console.log("🚀 Manual trigger: Processing embedding queue...");

    const supabase = await createAdminClient();
    // Check queue status
    const { data: stats, error: statsError } = await supabase
      .from("embedding_queue")
      .select("status")
      .eq("status", "queued");

    if (statsError) {
      return NextResponse.json({ error: "Failed to check queue" }, { status: 500 });
    }

    const queuedCount = stats?.length || 0;
    console.log(`📊 Queue status: ${queuedCount} items queued`);

    if (queuedCount === 0) {
      return NextResponse.json({
        message: "No items in queue",
        queuedCount: 0,
      });
    }

    // Call the process endpoint directly
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const processUrl = `${baseUrl}/api/embeddings/process`;

    console.log(`🔄 Triggering processing at ${processUrl}...`);

    const response = await fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    console.log(`✅ Processing triggered:`, result);

    return NextResponse.json({
      message: "Processing triggered",
      queuedCount,
      processingResult: result,
    });
  } catch (error) {
    console.error("❌ Error triggering processing:", error);
    return NextResponse.json(
      {
        error: "Failed to trigger processing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: "Use POST to trigger embedding processing",
    hint: "This endpoint manually triggers the embedding queue processor",
  });
}
