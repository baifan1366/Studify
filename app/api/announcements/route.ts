import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/announcements
export async function GET() {
  try {
    const client = await createServerClient();

    const { data, error } = await client
      .from("announcements")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// POST /api/announcements - create a new announcement
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await createServerClient();

    // Require owner_id explicitly until auth->profiles mapping is clarified
    if (!body.created_by) {
      return NextResponse.json({ error: "created_by is required" }, { status: 422 });
    }

    const payload = {
      title: body.title as string,
      message: body.message as string,
      image_url: body.image_url as string | null,
      deep_link: body.deep_link as string | null,
      status: body.status as string,
      scheduled_at: body.scheduled_at as string | null,
      sent_at: body.sent_at as string | null,
      onesignal_id: body.onesignal_id as string | null,
      onesignal_response: body.onesignal_response as string | null,
      created_by: body.created_by as number,
    };

    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("announcements")
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
