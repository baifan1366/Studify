import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses/[courseId] - fetch single course by public_id or slug
export async function GET(_: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const client = await createServerClient();
    const { courseId } = await params;
    const courseIdNum = parseInt(courseId, 10);
    
    const { data, error } = await client
      .from("course")
      .select("*")
      .eq("id", courseIdNum)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PATCH /api/courses/[courseId] - update by public_id or slug
export async function PATCH(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { courseId } = await params;
    const courseIdNum = parseInt(courseId, 10);

    // Check current course status first
    const { data: currentCourse, error: fetchError } = await client
      .from("course")
      .select("status")
      .eq("id", courseIdNum)
      .eq("is_deleted", false)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 404 });
    }

    // Only allow edits if course status is 'inactive'
    if (currentCourse.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot edit course with status '${currentCourse.status}'. Only courses with 'inactive' status can be edited.` 
      }, { status: 403 });
    }

    const updates = {
      title: body.title,
      description: body.description,
      slug: body.slug,
      visibility: body.visibility,
      price_cents: body.is_free ? 0 : body.price_cents,
      currency: body.currency,
      tags: body.tags,
      video_intro_url: body.video_intro_url,
      thumbnail_url: body.thumbnail_url,
      certificate_template: body.certificate_template,
      level: body.level,
      category: body.category,
      language: body.language,
      total_lessons: body.total_lessons,
      total_duration_minutes: body.total_duration_minutes,
      requirements: body.requirements,
      learning_objectives: body.learning_objectives,
      is_free: body.is_free,
      auto_create_classroom: body.auto_create_classroom,
      auto_create_community: body.auto_create_community,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course")
      .update(updates)
      .eq("id", courseIdNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// DELETE /api/courses/[courseId] - soft delete
export async function DELETE(_: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const client = await createServerClient();
    const { courseId } = await params;
    const courseIdNum = parseInt(courseId, 10);
    
    // Check current course status first
    const { data: currentCourse, error: fetchError } = await client
      .from("course")
      .select("status")
      .eq("id", courseIdNum)
      .eq("is_deleted", false)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 404 });
    }

    // Only allow deletion if course status is 'inactive'
    if (currentCourse.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot delete course with status '${currentCourse.status}'. Only courses with 'inactive' status can be deleted.` 
      }, { status: 403 });
    }
    
    const { error } = await client
      .from("course")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", courseIdNum);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
