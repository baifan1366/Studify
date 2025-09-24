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
    const { state } = body;

    // Validate state values
    if (!state || !['not_started','in_progress','completed'].includes(state)) {
      return NextResponse.json({ 
        error: "Invalid state. Must be 'not_started', 'in_progress', or 'completed'" 
      }, { status: 400 });
    }

    const { data, error } = await client
      .from("course_progress")
      .update({ 
        state,
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
      message: `Course state updated to ${state}` 
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message ?? "Internal error" 
    }, { status: 500 });
  }
}
