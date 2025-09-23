import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ progressId: string }> }) {
  try {
    const client = await createServerClient();
    const { progressId } = await params;
    
    const { data, error } = await client
      .from("course_progress")
      .select("*")
      .eq("public_id", progressId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ progressId: string }> }) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { progressId } = await params;

    const updates = {
      state: body.state,
      progress_pct: body.progress_pct,
      ai_recommendation: body.ai_recommendation,
      time_spent_sec: body.time_spent_sec,
      completion_date: body.completion_date,
      last_seen_at: body.last_seen_at,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course_progress")
      .update(updates)
      .eq("public_id", progressId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}