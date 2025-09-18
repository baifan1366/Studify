import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; courseId: string }> }
) {
  try {
    const { studentId: studentIdParam, courseId: courseIdParam } = await params;
    const studentId = parseInt(studentIdParam);
    const courseId = parseInt(courseIdParam);
    
    if (isNaN(courseId) || isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid course ID or student ID. Must be numbers." }, 
        { status: 400 }
      );
    }

    const client = await createServerClient();

    // Get specific enrollment with student profile and course details
    const { data, error } = await client
      .from("course_enrollment")
      .select(`
        *,
        student_profile:profiles!course_enrollment_user_id_fkey(*),
        course:course!course_enrollment_course_id_fkey(*)
      `)
      .eq("course_id", courseId)
      .eq("user_id", studentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Enrollment not found" }, 
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate progress (this could be enhanced with actual progress calculation)
    // For now, using a mock calculation or existing progress field
    const enrollmentWithProgress = {
      ...data,
      progress: data.progress || Math.floor(Math.random() * 100) // Replace with actual progress calculation
    };

    return NextResponse.json({ data: enrollmentWithProgress });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; courseId: string }> }
) {
  try {
    const { studentId: studentIdParam, courseId: courseIdParam } = await params;
    const studentId = parseInt(studentIdParam);
    const courseId = parseInt(courseIdParam);
    
    if (isNaN(courseId) || isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid course ID or student ID. Must be numbers." }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status values
    if (!status || !['active', 'completed', 'dropped', 'locked'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'active', 'completed', 'dropped', or 'locked'" 
      }, { status: 400 });
    }

    const client = await createServerClient();

    // Check if enrollment exists first
    const { data: existingEnrollment, error: checkError } = await client
      .from("course_enrollment")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", studentId)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 400 });
    }

    if (!existingEnrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" }, 
        { status: 404 }
      );
    }

    // Update the enrollment status using maybeSingle() for graceful error handling
    const { data, error } = await client
      .from("course_enrollment")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("course_id", courseId)
      .eq("user_id", studentId)
      .select(`
        *,
        student_profile:profiles!course_enrollment_user_id_fkey(*),
        course:course!course_enrollment_course_id_fkey(*)
      `)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Enrollment not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      data,
      message: `Student status updated to ${status}` 
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" }, 
      { status: 500 }
    );
  }
}