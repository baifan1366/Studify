import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const client = await createServerClient();
    const { data, error } = await client
        .from("course_enrollment")
        .select(`
          *,
          student_profile:profiles!course_enrollment_user_id_fkey(*),
          course:courses!course_enrollment_course_id_fkey(*)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
