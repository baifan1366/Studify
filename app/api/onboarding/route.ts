import { supabase } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles POST requests for updating user onboarding data.
 * @param {NextRequest} req - The incoming Next.js request object.
 * @returns {NextResponse} A response object with success or error message.
 */
export async function POST(req: NextRequest) {
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { locale, role, step, ...formData } = await req.json(); // Destructure step

  const onboardingData = user.user_metadata.onboarding || {};
  const newOnboardingData = { ...onboardingData, ...formData };

  const { error } = await (
    await supabase()
  ).auth.updateUser({
    data: { onboarding: newOnboardingData },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if it's the last step of onboarding
  if (step === 2) { // Assuming 2 is the last step number
    const { error: profileUpdateError } = await client
      .from("profiles")
      .update({ onboarded: true })
      .eq("user_id", user.id);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }
  }

  if (role) {
    revalidatePath(`/${locale}/${role.toLowerCase()}`);
  }

  return NextResponse.json({ success: true });
}