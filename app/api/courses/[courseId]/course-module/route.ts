import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses/[id]/course-module 
// - list all course module
// - list course module with specific course id
export async function GET(req: Request) {
  try {
    
    const body = await req.json();
    const client = await createServerClient();

    if(body.course_id) {
        const { data, error } = await client
            .from("course_module")
            .select("*")
            .eq("is_deleted", false)
            .eq("course_id", body.course_id)
            .order("created_at", { ascending: false });

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data });
    }

    const { data, error } = await client
      .from("course_module")
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

// POST /api/courses/[id]/course-module - create a new course module
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await createServerClient();

    if (!body.course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 422 });
    }

    const payload = {
      title: body.title as string,
      position: body.position as number,
      course_id: body.course_id,
    };

    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("course_module")
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
