import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    // Authorize for student, tutor, or admin roles
    const authResult = await authorize(["student", "tutor", "admin"]);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { attachmentId } = await params;
    const attachmentIdNum = parseInt(attachmentId, 10);

    if (isNaN(attachmentIdNum)) {
      return NextResponse.json(
        { error: "Invalid attachment ID" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Query video embeddings for this attachment
    const { data: embeddings, error } = await supabase
      .from("video_embeddings")
      .select("*")
      .eq("attachment_id", attachmentIdNum)
      .eq("is_deleted", false)
      .order("segment_index", { ascending: true });

    if (error) {
      console.error("[video-embeddings] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch video embeddings" },
        { status: 500 }
      );
    }

    // Calculate progress statistics
    const total = embeddings?.length || 0;
    const completed =
      embeddings?.filter((e) => e.status === "completed").length || 0;
    const failed = embeddings?.filter((e) => e.status === "failed").length || 0;
    const pending =
      embeddings?.filter(
        (e) => e.status === "pending" || e.status === "processing"
      ).length || 0;

    return NextResponse.json({
      embeddings: embeddings || [],
      stats: {
        total,
        completed,
        failed,
        pending,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("[video-embeddings] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
