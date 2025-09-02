import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/server";

// GET /api/courses/[id]/course-module/[id]/course-lesson 
// - list all course module
// - list course module with specific course id
export async function GET(req: Request) {
  try {
    
    const body = await req.json();
    const client = await supabase();

    if(body.course_id && body.module_id) {
        const { data, error } = await client
            .from("course_lesson")
            .select("*")
            .eq("is_deleted", false)
            .eq("course_id", body.course_id)
            .eq("module_id", body.module_id)
            .order("created_at", { ascending: false });

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ data });
    }

    const { data, error } = await client
      .from("course_lesson")
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

// POST /api/courses/[id]/course-module/[id]/course-lesson - create a new course lesson
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await supabase();

    if (!body.course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 422 });
    }

    if (!body.module_id) {
      return NextResponse.json({ error: "module_id is required" }, { status: 422 });
    }

    const payload = {
      title: body.title as string,
      kind: body.kind as string,
      content_url: body.content_url as string,
      duration_sec: body.duration_sec as number,
      course_id: body.course_id,
      module_id: body.module_id,
    };

    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("course_lesson")
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
