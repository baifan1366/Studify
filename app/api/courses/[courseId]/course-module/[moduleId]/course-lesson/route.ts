import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseLessonSchema } from "@/lib/validations/course-lesson";
import { z } from "zod";

// GET /api/courses/[courseId]/course-module/[moduleId]/course-lesson
// List course lessons with specific courseId and moduleId
export async function GET(
  req: Request,
  context: { params: Promise<{ courseId: string; moduleId: string }> } // 👈 Make params async
) {
  try {
    const { courseId, moduleId } = await context.params; // 👈 Await params
    const courseIdNum = parseInt(courseId, 10);
    const moduleIdNum = parseInt(moduleId, 10);
    const client = await createServerClient();

    if (!courseId || !moduleId) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
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
    const courseIdNum = parseInt(courseId, 10);
    const moduleIdNum = parseInt(moduleId, 10);
    const body = await req.json();
    const client = await createServerClient();

    if (!courseId || !moduleId) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    // Check course status first
    const { data: course, error: courseError } = await client
      .from("course")
      .select("status")
      .eq("id", courseIdNum)
      .eq("is_deleted", false)
      .single();

    if (courseError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Only allow lesson creation if course status is 'inactive'
    if (course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot create lesson for course with status '${course.status}'. Only courses with 'inactive' status can have lessons created.` 
      }, { status: 403 });
    }

    // Validate request body using Zod schema
    let payload;
    try {
      const schema = courseLessonSchema((key: string) => key); // Simple key passthrough for server-side
      const validatedData = schema.parse({
        courseId: courseIdNum,
        moduleId: moduleIdNum,
        title: body.title,
        kind: body.kind,
        content_url: body.content_url,
        duration_sec: body.duration_sec,
        attachments: body.attachments,
      });

      payload = {
        title: validatedData.title,
        kind: validatedData.kind,
        content_url: validatedData.content_url || null,
        duration_sec: validatedData.duration_sec || null,
        attachments: validatedData.attachments || null,
        course_id: courseIdNum,
        module_id: moduleIdNum,
      };
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: "Validation failed", 
          details: validationError.issues 
        }, { status: 422 });
      }
      throw validationError;
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
