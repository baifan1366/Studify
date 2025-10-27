import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json().catch(() => ({}));
    const task = body.task || "cleanup";

    console.log(`🧹 Maintenance task: ${task}`);

    if (task === "cleanup") {
      // Delete old completed items from queue (shouldn't be any, but just in case)
      const { error: deleteError } = await supabase
        .from("embedding_queue")
        .delete()
        .eq("status", "completed")
        .lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (deleteError) {
        console.error("Error cleaning up completed items:", deleteError);
      }

      // Delete very old failed items (older than 30 days)
      const { error: deleteFailedError } = await supabase
        .from("embedding_queue")
        .delete()
        .eq("status", "failed")
        .lt("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (deleteFailedError) {
        console.error("Error cleaning up old failed items:", deleteFailedError);
      }

      console.log("✅ Cleanup complete");
      return NextResponse.json({ message: "Cleanup complete", task });
    }

    if (task === "retry_failed") {
      // Reset failed items that haven't exceeded max retries
      const { data: failedItems, error: fetchError } = await supabase
        .from("embedding_queue")
        .select("*")
        .eq("status", "failed")
        .lt("retry_count", 3);

      if (fetchError) {
        console.error("Error fetching failed items:", fetchError);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
      }

      if (!failedItems || failedItems.length === 0) {
        console.log("No failed items to retry");
        return NextResponse.json({ message: "No items to retry", task });
      }

      // Reset to queued status
      const { error: updateError } = await supabase
        .from("embedding_queue")
        .update({
          status: "queued",
          scheduled_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("status", "failed")
        .lt("retry_count", 3);

      if (updateError) {
        console.error("Error resetting failed items:", updateError);
        return NextResponse.json({ error: "Failed to reset items" }, { status: 500 });
      }

      console.log(`✅ Reset ${failedItems.length} failed items for retry`);
      return NextResponse.json({
        message: `Reset ${failedItems.length} items for retry`,
        task,
        count: failedItems.length,
      });
    }

    return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  } catch (error) {
    console.error("❌ Maintenance error:", error);
    return NextResponse.json(
      {
        error: "Maintenance failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Export with signature verification
export const POST = process.env.NODE_ENV === "development" || !process.env.QSTASH_CURRENT_SIGNING_KEY
  ? handler
  : verifySignatureAppRouter(handler);

export async function GET() {
  return NextResponse.json({
    message: "Maintenance endpoint",
    tasks: ["cleanup", "retry_failed"],
    hint: "Use POST with {task: 'cleanup'} or {task: 'retry_failed'}",
  });
}
