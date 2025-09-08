import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseLessonSchema } from "@/lib/validations/course-lesson";
import { z } from "zod";

// GET /api/courses/[id]/course-module/[id]/course-lesson/[id] - fetch single course lesson by public_id 
export async function GET(_: Request, { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  try {
    const { lessonId } = await params;
    const lessonIdNum = parseInt(lessonId, 10);
    const client = await createServerClient();
    const { data, error } = await client
      .from("course_lesson")
      .select("*")
      .eq("id", lessonIdNum)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PATCH /api/courses/[id]/course-module/[id]/course-lesson/[id] - update by public_id
export async function PATCH(req: Request, { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  try {
    const { courseId, moduleId, lessonId } = await params;
    const courseIdNum = parseInt(courseId, 10);
    const moduleIdNum = parseInt(moduleId, 10);
    const lessonIdNum = parseInt(lessonId, 10);
    const body = await req.json();
    const client = await createServerClient();

    // Get lesson and check course status
    const { data: lesson, error: lessonError } = await client
      .from("course_lesson")
      .select("course_id")
      .eq("id", lessonIdNum)
      .eq("is_deleted", false)
      .single();

    if (lessonError) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check course status
    const { data: course, error: courseError } = await client
      .from("course")
      .select("status")
      .eq("id", lesson.course_id)
      .eq("is_deleted", false)
      .single();

    if (courseError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Only allow updates if course status is 'inactive'
    if (course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot update lesson for course with status '${course.status}'. Only courses with 'inactive' status can have lessons updated.` 
      }, { status: 403 });
    }

    // Validate request body using Zod schema
    let validatedData;
    try {
      const schema = courseLessonSchema((key: string) => key);
      validatedData = schema.parse({
        courseId: courseIdNum,
        moduleId: moduleIdNum,
        title: body.title,
        kind: body.kind,
        content_url: body.content_url,
        duration_sec: body.duration_sec
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: "Validation failed", 
          details: validationError.issues 
        }, { status: 422 });
      }
      throw validationError;
    }

    const updates = {
      title: validatedData.title,
      kind: validatedData.kind,
      content_url: validatedData.content_url,
      duration_sec: validatedData.duration_sec,
      live_session_id: body.live_session_id,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course_lesson")
      .update(updates)
      .eq("id", lessonIdNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// DELETE /api/courses/[id]/course-module/[id]/course-lesson/[id] - soft delete
export async function DELETE(_: Request, { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  try {
    const { lessonId } = await params;
    const lessonIdNum = parseInt(lessonId, 10);
    const client = await createServerClient();

    // Get lesson and check course status
    const { data: lesson, error: lessonError } = await client
      .from("course_lesson")
      .select("course_id")
      .eq("id", lessonIdNum)
      .eq("is_deleted", false)
      .single();

    if (lessonError) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check course status
    const { data: course, error: courseError } = await client
      .from("course")
      .select("status")
      .eq("id", lesson.course_id)
      .eq("is_deleted", false)
      .single();

    if (courseError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Only allow deletion if course status is 'inactive'
    if (course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot delete lesson for course with status '${course.status}'. Only courses with 'inactive' status can have lessons deleted.` 
      }, { status: 403 });
    }

    const { error } = await client
      .from("course_lesson")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", lessonIdNum);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
