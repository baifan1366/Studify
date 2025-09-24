import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ banId: string }> }) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const client = await createAdminClient();
    const { banId } = await params;
    
    const { data, error } = await client
      .from("ban")
      .select("*")
      .eq("public_id", banId)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ banId: string }> }) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const body = await req.json();
    const client = await createAdminClient();
    const { banId } = await params;

    const updates = {
      reason: body.reason,
      status: body.status,
      updated_at: new Date().toISOString(),
      expires_at: body.expires_at,
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("ban")
      .update(updates)
      .eq("public_id", banId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ banId: string }> }) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const client = await createAdminClient();
    const { banId } = await params;
    
    const { error } = await client
      .from("ban")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("public_id", banId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
