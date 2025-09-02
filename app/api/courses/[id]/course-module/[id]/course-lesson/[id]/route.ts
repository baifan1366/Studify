import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/server";

// GET /api/courses/[id]/course-module/[id]/course-lesson/[id] - fetch single course lesson by public_id 
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const client = await supabase();
    const { data, error } = await client
      .from("course_lesson")
      .select("*")
      .eq("public_id", params.id)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PATCH /api/courses/[id]/course-module/[id]/course-lesson/[id] - update by public_id
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const client = await supabase();

    const updates = {
      title: body.title,
      kind: body.kind,
      content_url: body.content_url,
      duration_sec: body.duration_sec,
      live_session_id: body.live_session_id,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course_lesson")
      .update(updates)
      .eq("public_id", params.id)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// DELETE /api/courses/[id]/course-module/[id]/course-lesson/[id] - soft delete
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const client = await supabase();
    const { error } = await client
      .from("course_lesson")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("public_id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
