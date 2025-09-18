import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId: courseIdParam } = await params;
    const courseId = parseInt(courseIdParam);
    
    if (isNaN(courseId)) {
      return NextResponse.json(
        { error: "Invalid course ID. Must be a number." }, 
        { status: 400 }
      );
    }

    const client = await createServerClient();

    const { data, error } = await client
        .from("course_enrollment")
        .select(`
          *,
          student_profile:profiles!course_enrollment_user_id_fkey(*),
          course:course!course_enrollment_course_id_fkey(*)
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
