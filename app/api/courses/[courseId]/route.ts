import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/server";

// GET /api/courses/[id] - fetch single course by public_id
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const client = await supabase();
    const { data, error } = await client
      .from("course")
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

// PATCH /api/courses/[id] - update by public_id
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const client = await supabase();

    // Optional: authorize ownership
    // const { data: auth } = await client.auth.getUser();

    const updates = {
      title: body.title,
      description: body.description,
      visibility: body.visibility,
      price_cents: body.is_free ? 0 : body.price_cents,
      currency: body.currency,
      tags: body.tags,
      thumbnail_url: body.thumbnail_url,
      level: body.level,
      total_lessons: body.total_lessons,
      total_duration_minutes: body.total_duration_minutes,
      is_free: body.is_free,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course")
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

// DELETE /api/courses/[id] - soft delete
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const client = await supabase();
    const { error } = await client
      .from("course")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("public_id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
