import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ rolePermissionId: string }> }) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const client = await createAdminClient();
    const { rolePermissionId } = await params;
    
    const { data, error } = await client
      .from("role_permission")
      .select("*")
      .eq("public_id", rolePermissionId)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ rolePermissionId: string }> }) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const body = await req.json();
    const client = await createAdminClient();
    const { rolePermissionId } = await params;

    const updates = {
      role_id: body.role_id,
      permission_id: body.permission_id,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("role_permission")
      .update(updates)
      .eq("public_id", rolePermissionId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ rolePermissionId: string }> }) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const client = await createAdminClient();
    const { rolePermissionId } = await params;
    
    const { error } = await client
      .from("role_permission")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("public_id", rolePermissionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
