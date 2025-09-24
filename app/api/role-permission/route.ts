import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const client = await createAdminClient();

    const { data, error } = await client
      .from("role_permission")
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
      role_id: body.role_id,
      permission_id: body.permission_id,
    };

    if (!payload.role_id || !payload.permission_id) {
      return NextResponse.json({ error: "role_id and permission_id are required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("role_permission")
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