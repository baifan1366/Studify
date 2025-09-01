import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/server";

// GET /api/users/profile - fetch user profile
export async function GET(_: Request) {
  try {
    const client = await supabase();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ data: data[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

// PUT /api/users/profile - update user profile
export async function PUT(req: Request) {
  try {
    const client = await supabase();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Assuming the body contains the fields to update in the profiles table
    // For example: { full_name: "New Name", avatar_url: "new_url.jpg" }

    const { data, error } = await client
      .from("profiles")
      .update(body)
      .eq("user_id", user.id)
      .select(); // Select the updated row

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Profile not found or not updated" }, { status: 404 });
    }

    return NextResponse.json({ data: data[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}