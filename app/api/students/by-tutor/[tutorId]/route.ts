import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  try {
    const { tutorId: tutorIdParam } = await params;
    const tutorId = parseInt(tutorIdParam);
    
    if (isNaN(tutorId)) {
      return NextResponse.json(
        { error: "Invalid tutor ID. Must be a number." }, 
        { status: 400 }
      );
    }

    const client = await createServerClient();

    // Step 1: Get all courses belonging to this tutor
    const { data: courses, error: coursesError } = await client
      .from("course")
      .select("id, title")
      .eq("owner_id", tutorId);

    if (coursesError) {
      return NextResponse.json(
        { error: coursesError.message }, 
        { status: 400 }
      );
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: "No courses found for this tutor" 
      });
    }

    // Step 2: Get course IDs for the query
    const courseIds = courses.map(course => course.id);

    // Step 3: Get all enrollments for tutor's courses with student profiles
    const { data: enrollments, error: enrollmentsError } = await client
      .from("course_enrollment")
      .select(`
        *,
        student_profile:profiles!course_enrollment_user_id_fkey(
          id,
          display_name,
          full_name,
          email,
          avatar_url
        ),
        course:course!course_enrollment_course_id_fkey(
          id,
          title,
          slug,
          price_cents
        )
      `)
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });

    if (enrollmentsError) {
      return NextResponse.json(
        { error: enrollmentsError.message }, 
        { status: 400 }
      );
    }

    // Step 4: Structure the response data
    const responseData = {
      tutor_id: tutorId,
      total_courses: courses.length,
      total_students: enrollments?.length || 0,
      courses: courses,
      enrollments: enrollments || []
    };

    return NextResponse.json({ data: responseData });

  } catch (e: any) {
    console.error("Error in GET /api/students/[tutorId]:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" }, 
      { status: 500 }
    );
  }
}
