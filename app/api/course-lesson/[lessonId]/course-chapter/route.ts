import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseChapterSchema } from "@/lib/validations/course-chapter";
import { z } from "zod";

// Helper function to validate lesson ownership and get internal ID
async function validateLessonOwnership(client: any, lessonId: string, ownerId?: number) {
  const { data: lesson, error: lessonError } = await client
    .from("course_lesson")
    .select(`
      id,
      public_id,
      course_id,
      course:course_id (
        id,
        owner_id,
        status
      )
    `)
    .eq("public_id", lessonId)
    .eq("is_deleted", false)
    .single();

  if (lessonError || !lesson) {
    return { error: "Lesson not found", status: 404 };
  }

  // Validate owner_id if provided
  if (ownerId && lesson.course.owner_id !== ownerId) {
    return { error: "Access denied. You can only manage chapters for your own lessons.", status: 403 };
  }

  return { lesson, error: null, status: 200 };
}

// GET /api/course-lesson/[lessonId]/course-chapter - fetch all chapters for a lesson
export async function GET(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await params;
    const url = new URL(req.url);
    const ownerId = url.searchParams.get('owner_id');
    const ownerIdNum = ownerId ? parseInt(ownerId, 10) : undefined;

    const client = await createServerClient();

    // Validate lesson ownership and get internal ID
    const validation = await validateLessonOwnership(client, lessonId, ownerIdNum);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Use the internal lesson ID (bigint) for querying chapters
    const internalLessonId = validation.lesson.id;

    // Fetch chapters for the lesson
    const { data: chapters, error } = await client
      .from("course_chapter")
      .select("*")
      .eq("lesson_id", internalLessonId)
      .eq("is_deleted", false)
      .order("order_index", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: chapters });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// POST /api/course-lesson/[lessonId]/course-chapter - create new chapter
export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await params;
    const body = await req.json();
    const client = await createServerClient();

    // Validate lesson ownership and get internal ID
    const validation = await validateLessonOwnership(client, lessonId, body.owner_id);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Use the internal lesson ID (bigint)
    const internalLessonId = validation.lesson.id;

    // Check if course status allows chapter creation (only inactive courses)
    if (validation.lesson.course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot create chapter for course with status '${validation.lesson.course.status}'. Only courses with 'inactive' status can have chapters created.` 
      }, { status: 403 });
    }

    // Validate request body
    let validatedData;
    try {
      validatedData = courseChapterSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: "Validation failed", 
          details: validationError.issues 
        }, { status: 422 });
      }
      throw validationError;
    }

    // Get the next order_index if not provided
    if (!validatedData.order_index) {
      const { data: lastChapter } = await client
        .from("course_chapter")
        .select("order_index")
        .eq("lesson_id", internalLessonId)
        .eq("is_deleted", false)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

      validatedData.order_index = lastChapter ? lastChapter.order_index + 1 : 1;
    }

    // Create the chapter
    const { data: chapter, error } = await client
      .from("course_chapter")
      .insert({
        lesson_id: internalLessonId,
        title: validatedData.title,
        description: validatedData.description,
        start_time_sec: validatedData.start_time_sec,
        end_time_sec: validatedData.end_time_sec,
        order_index: validatedData.order_index,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: chapter }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}