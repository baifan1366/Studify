import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/announcements/[id]
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const idNum = parseInt(id, 10);
    
    const { data, error } = await client
      .from("announcements")
      .select("*")
      .eq("id", idNum)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PATCH /api/announcements/[id] - update by public_id or slug
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { id } = await params;
    const idNum = parseInt(id, 10);

    const updates = {
        title: body.title as string,
        message: body.message as string,
        image_url: body.image_url as string | null,
        deep_link: body.deep_link as string | null,
        status: body.status as string,
        scheduled_at: body.scheduled_at as string | null,
        sent_at: body.sent_at as string | null,
        onesignal_id: body.onesignal_id as string | null,
        onesignal_response: body.onesignal_response as string | null,
        is_deleted: body.is_deleted as boolean,
        created_at: body.created_at as string,
        updated_at: body.updated_at as string,
        deleted_at: body.deleted_at as string | null
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("announcements")
      .update(updates)
      .eq("id", idNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// DELETE /api/announcements/[id] - soft delete
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const idNum = parseInt(id, 10);
    
    const { error } = await client
      .from("announcements")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", idNum);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
