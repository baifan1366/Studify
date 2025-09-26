//pass the lesson public_id and find current user id to get the specific progress
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    // Use server guard for authentication
    const authResponse = await authorize('student');
    if (authResponse instanceof NextResponse) return authResponse;
    
    const { payload, user } = authResponse;
    const { lessonId } = await params;

    // Get user profile ID from the cached user info
    const userId = user.profile?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const supabase = await createAdminClient();

    // First, get the numeric lesson ID from the public_id
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    const { data, error } = await supabase
      .from("course_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const body = await req.json();
    
    // Use server guard for authentication
    const authResponse = await authorize('student');
    if (authResponse instanceof NextResponse) return authResponse;
    
    const { payload, user } = authResponse;
    const { lessonId } = await params;

    // Get user profile ID from the cached user info
    const userId = user.profile?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const supabase = await createAdminClient();

    // First, get the numeric lesson ID from the public_id
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const updates = {
      state: body.state,
      progress_pct: body.progress_pct,
      ai_recommendation: body.ai_recommendation,
      time_spent_sec: body.time_spent_sec,
      completion_date: body.completion_date,
      last_seen_at: body.last_seen_at,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await supabase
      .from("course_progress")
      .update(updates)
      .eq("lesson_id", lesson.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}