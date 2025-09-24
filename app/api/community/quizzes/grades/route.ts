import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: grades, error } = await supabase
      .from("community_quiz_grade")
      .select("*")
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(grades || [], { status: 200 });
  } catch (err: any) {
    console.error("Fetch grades error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Only admin can create grades
    const authResult = await authorize("admin");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();
    const body = await req.json();
    const { code, translations } = body;

    if (!code || !translations) {
      return NextResponse.json(
        { error: "Code and translations are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("community_quiz_grade")
      .insert({ code, translations })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Create grade error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
