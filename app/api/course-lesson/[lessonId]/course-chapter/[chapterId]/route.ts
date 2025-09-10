import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseChapterUpdateSchema } from "@/lib/validations/course-chapter";
import { z } from "zod";

// Helper function to validate chapter ownership
async function validateChapterOwnership(client: any, chapterId: number, ownerId?: number) {
  const { data: chapter, error: chapterError } = await client
    .from("course_chapter")
    .select(`
      id,
      lesson_id,
      lesson:lesson_id (
        id,
        course_id,
        course:course_id (
          id,
          owner_id,
          status
        )
      )
    `)
    .eq("id", chapterId)
    .eq("is_deleted", false)
    .single();

  if (chapterError || !chapter) {
    return { error: "Chapter not found", status: 404 };
  }

  // Validate owner_id if provided
  if (ownerId && chapter.lesson.course.owner_id !== ownerId) {
    return { error: "Access denied. You can only manage your own chapters.", status: 403 };
  }

  return { chapter, error: null, status: 200 };
}

// GET /api/course-lesson/[lessonId]/course-chapter/[chapterId] - fetch single chapter
export async function GET(req: Request, { params }: { params: Promise<{ lessonId: string; chapterId: string }> }) {
  try {
    const { chapterId } = await params;
    const chapterIdNum = parseInt(chapterId, 10);
    const url = new URL(req.url);
    const ownerId = url.searchParams.get('owner_id');
    const ownerIdNum = ownerId ? parseInt(ownerId, 10) : undefined;

    const client = await createServerClient();

    // Validate chapter ownership
    const validation = await validateChapterOwnership(client, chapterIdNum, ownerIdNum);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Fetch the chapter
    const { data: chapter, error } = await client
      .from("course_chapter")
      .select("*")
      .eq("id", chapterIdNum)
      .eq("is_deleted", false)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data: chapter });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PATCH /api/course-lesson/[lessonId]/course-chapter/[chapterId] - update chapter
export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string; chapterId: string }> }) {
  try {
    const { chapterId } = await params;
    const chapterIdNum = parseInt(chapterId, 10);
    const body = await req.json();
    const client = await createServerClient();

    // Validate chapter ownership
    const validation = await validateChapterOwnership(client, chapterIdNum, body.owner_id);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Check if course status allows chapter updates (only inactive courses)
    if (validation.chapter.lesson.course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot update chapter for course with status '${validation.chapter.lesson.course.status}'. Only courses with 'inactive' status can have chapters updated.` 
      }, { status: 403 });
    }

    // Validate request body
    let validatedData;
    try {
      validatedData = courseChapterUpdateSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: "Validation failed", 
          details: validationError.issues 
        }, { status: 422 });
      }
      throw validationError;
    }

    // Prepare update object
    const updates = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    // Remove undefined values
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    // Update the chapter
    const { data: chapter, error } = await client
      .from("course_chapter")
      .update(updates)
      .eq("id", chapterIdNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: chapter });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// DELETE /api/course-lesson/[lessonId]/course-chapter/[chapterId] - soft delete chapter
export async function DELETE(req: Request, { params }: { params: Promise<{ lessonId: string; chapterId: string }> }) {
  try {
    const { chapterId } = await params;
    const chapterIdNum = parseInt(chapterId, 10);
    const url = new URL(req.url);
    const ownerId = url.searchParams.get('owner_id');
    const ownerIdNum = ownerId ? parseInt(ownerId, 10) : undefined;

    const client = await createServerClient();

    // Validate chapter ownership
    const validation = await validateChapterOwnership(client, chapterIdNum, ownerIdNum);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Check if course status allows chapter deletion (only inactive courses)
    if (validation.chapter.lesson.course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot delete chapter for course with status '${validation.chapter.lesson.course.status}'. Only courses with 'inactive' status can have chapters deleted.` 
      }, { status: 403 });
    }

    // Soft delete the chapter
    const { error } = await client
      .from("course_chapter")
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      })
      .eq("id", chapterIdNum);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
