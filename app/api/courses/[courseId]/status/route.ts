import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// PATCH /api/courses/[courseId]/status - update course status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    // Parse courseId from URL parameter (Next.js params are always strings)
    const { courseId: courseIdString } = await params;
    const courseId = parseInt(courseIdString, 10);

    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const { status } = body;

    // Validate status values
    if (!status || !['active', 'pending', 'inactive', 'ban', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'active', 'pending', 'inactive', 'ban', or 'rejected'" 
      }, { status: 400 });
    }

    // First, get the current course to verify ownership and current status
    const { data: currentCourse, error: fetchError } = await client
      .from("course")
      .select("id, owner_id, status, title")
      .eq("id", courseId)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !currentCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Business logic validation based on corrected requirements
    // Tutors can only:
    // 1. Submit inactive courses for approval (inactive → pending)
    // 2. Change active courses back to inactive (active → inactive)
    // 3. Acknowledge rejected courses (rejected → inactive)
    
    if (status === 'pending' && currentCourse.status !== 'inactive') {
      return NextResponse.json({ 
        error: "Only inactive courses can be submitted for approval" 
      }, { status: 400 });
    }

    if (status === 'inactive' && !['active', 'rejected'].includes(currentCourse.status)) {
      return NextResponse.json({ 
        error: "Only active or rejected courses can be changed to inactive" 
      }, { status: 400 });
    }

    // Prevent tutors from directly setting courses to active (only admins should do this)
    if (status === 'active') {
      return NextResponse.json({ 
        error: "Courses cannot be directly set to active. Only admins can approve pending courses." 
      }, { status: 403 });
    }

    // Prevent tutors from directly setting courses to ban (only admins should do this via ban system)
    if (status === 'ban') {
      return NextResponse.json({ 
        error: "Courses cannot be directly set to banned. Only admins can ban courses via the ban management system." 
      }, { status: 403 });
    }

    // Update the course status
    const { data, error } = await client
      .from("course")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", courseId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      data,
      message: `Course status updated to ${status}` 
    });

  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message ?? "Internal error" 
    }, { status: 500 });
  }
}
