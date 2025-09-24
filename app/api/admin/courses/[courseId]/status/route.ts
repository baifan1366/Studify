import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// PATCH /api/admin/courses/[courseId]/status - admin update course status (including ban)
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

    // Admin can set any valid status including "ban"
    if (!status || !['active', 'pending', 'inactive', 'ban'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'active', 'pending', 'inactive', or 'ban'" 
      }, { status: 400 });
    }

    // Verify the course exists
    const { data: currentCourse, error: fetchError } = await client
      .from("course")
      .select("id, owner_id, status, title")
      .eq("id", courseId)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !currentCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Admin has full control over course status changes
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
