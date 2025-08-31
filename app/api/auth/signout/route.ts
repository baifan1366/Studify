import { createSupabaseClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: "Signed out" });
}
