import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ progressId: string }> }
) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { progressId } = await params;
    const { status } = body;

    // Validate status values
    if (!status || !['not_started','in_progress','completed'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'not_started', 'in_progress', or 'completed'" 
      }, { status: 400 });
    }

    const { data, error } = await client
      .from("course_progress")
      .update({ 
        status,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("public_id", progressId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      data,
      message: `Course status updated to ${status}` 
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message ?? "Internal error" 
    }, { status: 500 });
  }
}
