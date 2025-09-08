import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses/[id]/course-module/[id] - fetch single course module by public_id 
export async function GET(_: Request, { params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  try {
    const { moduleId } = await params;
    const moduleIdNum = parseInt(moduleId, 10);
    const client = await createServerClient();
    const { data, error } = await client
      .from("course_module")
      .select("*")
      .eq("id", moduleIdNum)
      .eq("is_deleted", false)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PATCH /api/courses/[id]/course-module/[id] - update by public_id
export async function PATCH(req: Request, { params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  try {
    const { moduleId } = await params;
    const moduleIdNum = parseInt(moduleId, 10);
    const body = await req.json();
    const client = await createServerClient();

    // Get module and check course status
    const { data: module, error: moduleError } = await client
      .from("course_module")
      .select("course_id")
      .eq("id", moduleIdNum)
      .eq("is_deleted", false)
      .single();

    if (moduleError) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Check course status
    const { data: course, error: courseError } = await client
      .from("course")
      .select("status")
      .eq("id", module.course_id)
      .eq("is_deleted", false)
      .single();

    if (courseError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Only allow updates if course status is 'inactive'
    if (course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot update module for course with status '${course.status}'. Only courses with 'inactive' status can have modules updated.` 
      }, { status: 403 });
    }

    const updates = {
      title: body.title,
      position: body.position,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course_module")
      .update(updates)
      .eq("id", moduleIdNum)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// DELETE /api/courses/[id]/course-module/[id] - soft delete
export async function DELETE(_: Request, { params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  try {
    const { moduleId } = await params;
    const moduleIdNum = parseInt(moduleId, 10);
    const client = await createServerClient();

    // Get module and check course status
    const { data: module, error: moduleError } = await client
      .from("course_module")
      .select("course_id")
      .eq("id", moduleIdNum)
      .eq("is_deleted", false)
      .single();

    if (moduleError) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Check course status
    const { data: course, error: courseError } = await client
      .from("course")
      .select("status")
      .eq("id", module.course_id)
      .eq("is_deleted", false)
      .single();

    if (courseError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Only allow deletion if course status is 'inactive'
    if (course.status !== 'inactive') {
      return NextResponse.json({ 
        error: `Cannot delete module for course with status '${course.status}'. Only courses with 'inactive' status can have modules deleted.` 
      }, { status: 403 });
    }

    const { error } = await client
      .from("course_module")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", moduleIdNum);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
