import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ studentId: string, courseId: string }> }
) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { courseId: courseIdStr, studentId: studentIdStr } = await params;
    
    // Parse string parameters to numbers
    const courseId = parseInt(courseIdStr);
    const studentId = parseInt(studentIdStr);
    
    // Validate that the parameters are valid numbers
    if (isNaN(courseId) || isNaN(studentId)) {
      return NextResponse.json({ 
        error: "Invalid studentId or courseId. Must be valid numbers." 
      }, { status: 400 });
    }

    const { status } = body;

    // Validate status values active','completed','dropped','locked'
    if (!status || !['active', 'completed', 'dropped', 'locked'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be 'active', 'completed', 'dropped', or 'locked'" 
      }, { status: 400 });
    }

    const { data, error } = await client
      .from("course_enrollment")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("course_id", courseId)
      .eq("user_id", studentId)
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
