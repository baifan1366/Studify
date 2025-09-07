import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses/[courseId]/course-module/[moduleId]/course-lesson
// List course lessons with specific courseId and moduleId
export async function GET(
  req: Request,
  context: { params: Promise<{ courseId: string; moduleId: string }> } // 👈 Make params async
) {
  try {
    const { courseId, moduleId } = await context.params; // 👈 Await params
    const client = await createServerClient();

    const courseIdNum = parseInt(courseId);
    const moduleIdNum = parseInt(moduleId);

    if (isNaN(courseIdNum)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    if (isNaN(moduleIdNum)) {
      return NextResponse.json({ error: "Invalid module ID" }, { status: 400 });
    }

    const { data, error } = await client
      .from("course_lesson")
      .select("*")
      .eq("is_deleted", false)
      .eq("course_id", courseIdNum)
      .eq("module_id", moduleIdNum)
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

// POST /api/courses/[courseId]/course-module/[moduleId]/course-lesson
// Create a new course lesson
export async function POST(
  req: Request,
  context: { params: Promise<{ courseId: string; moduleId: string }> } // 👈 Make params async
) {
  try {
    const { courseId, moduleId } = await context.params; // 👈 Await params
    const body = await req.json();
    const client = await createServerClient();

    const courseIdNum = parseInt(courseId);
    const moduleIdNum = parseInt(moduleId);

    if (isNaN(courseIdNum)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    if (isNaN(moduleIdNum)) {
      return NextResponse.json({ error: "Invalid module ID" }, { status: 400 });
    }

    const payload = {
      title: body.title as string,
      kind: body.kind as string,
      content_url: body.content_url as string || null,
      duration_sec: body.duration_sec as number || null,
      course_id: courseIdNum,
      module_id: moduleIdNum,
    };

    // Validate required fields
    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }
    if (!payload.kind) {
      return NextResponse.json({ error: "kind is required" }, { status: 422 });
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
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
