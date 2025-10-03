import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string, courseId: string }> }
) {
  try {
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();
    const { userId, courseId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Get enrolled courses with course details
    const { data, error } = await supabase
      .from("course_enrollment")
      .select(`
        *,
        course:course_id (
          id,
          public_id,
          title,
          description,
          slug,
          thumbnail_url,
          price_cents,
          currency,
          level,
          category,
          status,
          created_at,
          updated_at
        )
      `)
      .eq("user_id", parseInt(userId))
      .eq("course_id", parseInt(courseId))
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Error fetching enrolled courses:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Enrolled courses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
