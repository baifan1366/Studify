import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses/[courseId] - fetch single course by public_id or slug
export async function GET(_: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const client = await createServerClient();
    const { courseId } = await params;
    
    // Check if courseId is a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    
    const { data, error } = await client
      .from("course")
      .select("*")
      .eq(isUUID ? "public_id" : "slug", courseId)
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

    // Optional: authorize ownership
    // const { data: auth } = await client.auth.getUser();

    // Check if courseId is a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);

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
      .eq(isUUID ? "public_id" : "slug", courseId)
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
    
    // Check if courseId is a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
    
    const { error } = await client
      .from("course")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq(isUUID ? "public_id" : "slug", courseId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
