import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

// GET /api/classroom/enrolled-courses - list enrolled courses
export async function GET(req: Request) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(req.url);
    //get number userId
    const userId = searchParams.get('userId');

    if(userId) {
      const {data, error} = await client
        .from("course_enrollment")
        .select("*")
        .eq("user_id", parseInt(userId))
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ data });
    }

    const { data, error } = await client
      .from("course_enrollment")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}