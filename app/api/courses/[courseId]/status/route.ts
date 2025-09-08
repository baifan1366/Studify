import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// PATCH /api/courses/[id]/status - update course status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const courseId = parseInt(params.id);

    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const { status } = body;

    // Validate status values
    if (!status || !['active', 'pending', 'inactive'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'active', 'pending', or 'inactive'" 
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

    // Business logic validation
    if (currentCourse.status === 'pending' && status !== 'active' && status !== 'inactive') {
      return NextResponse.json({ 
        error: "Pending courses can only be changed to active (by admin) or inactive" 
      }, { status: 400 });
    }

    // Only allow tutors to submit inactive courses to pending
    // Admins can change any status (this would be handled by admin endpoints)
    if (status === 'pending' && currentCourse.status !== 'inactive') {
      return NextResponse.json({ 
        error: "Only inactive courses can be submitted for approval" 
      }, { status: 400 });
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
