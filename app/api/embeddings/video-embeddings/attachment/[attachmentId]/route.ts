import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  try {
    const client = await createServerClient();
    const { attachmentId } = await params;
    const attachmentIdNum = parseInt(attachmentId, 10);
    
    const { data, error } = await client
      .from("video_embeddings")
      .select("*")
      .eq("attachment_id", attachmentIdNum)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}