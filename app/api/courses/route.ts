import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/courses - list public courses
export async function GET(req: Request) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(req.url);
    const owner_id = searchParams.get('owner_id');

    if(owner_id) {
      const {data, error} = await client
        .from("course")
        .select("*")
        .eq("is_deleted", false)
        .eq("owner_id", parseInt(owner_id))
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ data });
    }

    const { data, error } = await client
      .from("course")
      .select("*")
      .eq("is_deleted", false)
      .eq("visibility", "public")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// POST /api/courses - create a new course
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await createServerClient();

    // Require owner_id explicitly until auth->profiles mapping is clarified
    if (!body.owner_id) {
      return NextResponse.json({ error: "owner_id is required" }, { status: 422 });
    }

    const payload = {
      title: body.title as string,
      description: body.description ?? null,
      slug: body.slug as string,
      visibility: (body.visibility ?? "private") as string,
      price_cents: body.is_free ? 0 : body.price_cents ?? 0,
      currency: body.currency ?? "MYR",
      tags: Array.isArray(body.tags) ? body.tags : [],
      thumbnail_url: body.thumbnail_url ?? null,
      level: body.level ?? "beginner",
      total_lessons: body.total_lessons ?? 0,
      total_duration_minutes: body.total_duration_minutes ?? 0,
      average_rating: body.average_rating ?? 0,
      total_students: body.total_students ?? 0,
      is_free: !!body.is_free,
      owner_id: parseInt(body.owner_id),
      video_intro_url: body.video_intro_url ?? null,
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      learning_objectives: Array.isArray(body.learning_objectives) ? body.learning_objectives : [],
      category: body.category ?? null,
      language: body.language ?? "en",
      certificate_template: body.certificate_template ?? null,
      auto_create_classroom: !!body.auto_create_classroom,
      auto_create_community: !!body.auto_create_community,
      status: body.status ?? "inactive",
    };

    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }

    if (!payload.slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("course")
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
