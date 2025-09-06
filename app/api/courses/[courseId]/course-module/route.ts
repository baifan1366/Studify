import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses/[courseId]/course-module - list course modules by course ID
export async function GET(
  req: Request,
  context: { params: Promise<{ courseId: string }> } // Make params async
) {
  try {
    const { courseId } = await context.params; // Await params here
    const client = await createServerClient();
    const courseIdNum = parseInt(courseId);

    if (isNaN(courseIdNum)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const { data, error } = await client
      .from("course_module")
      .select("*")
      .eq("is_deleted", false)
      .eq("course_id", courseIdNum)
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// POST /api/courses/[courseId]/course-module - create a new course module
export async function POST(
  req: Request,
  context: { params: Promise<{ courseId: string }> } // Make params async
) {
  try {
    const { courseId } = await context.params; // Await params here
    const body = await req.json();
    const client = await createServerClient();
    const courseIdNum = parseInt(courseId);

    if (isNaN(courseIdNum)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const payload = {
      title: body.title as string,
      position: body.position as number,
      course_id: courseIdNum,
      description: body.description as string || null,
      is_published: body.is_published as boolean || false,
      estimated_duration_minutes: body.estimated_duration_minutes as number || null,
    };

    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }

    if (!payload.position) {
      return NextResponse.json({ error: "position is required" }, { status: 422 });
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
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
