import { NextResponse } from "next/server";
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const client = await createAdminClient();

    const { data, error } = await client
      .from("ban")
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

  try {
    const body = await req.json();
    const client = await createAdminClient();

    const payload = {
      target_id: body.target_id,
      target_type: body.target_type,
      reason: body.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (!payload.target_id) {
      return NextResponse.json({ error: "target_id is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("ban")
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