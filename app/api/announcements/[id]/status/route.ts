import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// PATCH /api/announcements/[id]/status - update announcement status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    // Parse id from URL parameter (Next.js params are always strings)
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (!idNum || isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
    }

    const { status, scheduled_at } = body;

    // Validate status values draft | scheduled | sent | failed
    if (!status || !['draft', 'scheduled', 'sent', 'failed'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'draft', 'scheduled', 'sent', or 'failed'" 
      }, { status: 400 });
    }

    // Update the announcement status
    const { data, error } = await client
      .from("announcements")
      .update({ 
        status,
        scheduled_at,
        updated_at: new Date().toISOString()
      })
      .eq("id", idNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      data,
      message: `Announcement status updated to ${status}` 
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message ?? "Internal error" 
    }, { status: 500 });
  }
}
