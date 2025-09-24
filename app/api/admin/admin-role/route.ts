import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const client = await createAdminClient();

    const { data, error } = await client
      .from("admin_roles")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }
  try {
    const body = await req.json();
    const client = await createAdminClient();

    const payload = {
      user_id: body.user_id,
      role_permission_id: body.role_permission_id,
    };

    if (!payload.user_id || !payload.role_permission_id) {
      return NextResponse.json({ error: "user_id and role_permission_id are required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("admin_roles")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}