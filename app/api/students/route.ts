import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

//get enrolled students for each course
export async function GET(req: Request) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get('course_id');
    const user_id = searchParams.get('user_id');

    // Validate and parse parameters
    const courseIdNum = course_id ? parseInt(course_id) : null;
    const userIdNum = user_id ? parseInt(user_id) : null;

    if (courseIdNum && !isNaN(courseIdNum)) {
      const {data, error} = await client
        .from("course_enrollment")
        .select(`
          *,
          student_profile:profiles!course_enrollment_user_id_fkey(*),
          course:courses!course_enrollment_course_id_fkey(*)
        `)
        .eq("course_id", courseIdNum)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ data });
    }

    if (userIdNum && !isNaN(userIdNum)) {
      const { data, error } = await client
        .from("course_enrollment")
        .select(`
          *,
          student_profile:profiles!course_enrollment_user_id_fkey(*),
          course:courses!course_enrollment_course_id_fkey(*)
        `)
        .eq("user_id", userIdNum)
        .order("created_at", { ascending: false });

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
        }
      return NextResponse.json({ data });
    }

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
