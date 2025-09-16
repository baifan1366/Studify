import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/classroom/enrolled-courses - list enrolled courses
export async function GET(req: Request) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(req.url);
    //get number userId
    const userId = searchParams.get('userId');

    if(userId) {
      const {data, error} = await client
        .from("course_enrollment")
        .select("*")
        .eq("user_id", parseInt(userId))
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ data });
    }

    const { data, error } = await client
      .from("course_enrollment")
      .select("*")
      .order("created_at", { ascending: false });

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
    const client = await createServerClient();

    // Require owner_id explicitly until auth->profiles mapping is clarified
    if (!body.course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 422 });
    }

    const payload = {
      course_id: body.course_id,
      user_id: body.user_id,
      role: body.role,
      status: body.status,
      started_at: body.started_at,
      completed_at: body.completed_at,
      created_at: body.created_at,
      updated_at: body.updated_at,
    };

    if (!payload.user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("course_enrollment")
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