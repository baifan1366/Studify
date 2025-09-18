import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

//get enrolled students for each course
export async function GET(req: Request) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get('course_id');
    const user_id = searchParams.get('user_id');

    if(course_id) {
      const {data, error} = await client
        .from("course_enrollment")
        .select("*")
        .eq("course_id", parseInt(course_id))
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ data });
    }

    if (user_id) {
      const { data, error } = await client
        .from("course_enrollment")
        .select("*")
        .eq("user_id", parseInt(user_id))
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
