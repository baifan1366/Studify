import { createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles POST requests for updating user onboarding data.
 * Saves onboarding choices to profile preferences and triggers embedding update.
 * @param {NextRequest} req - The incoming Next.js request object.
 * @returns {NextResponse} A response object with success or error message.
 */
export async function POST(req: NextRequest) {
  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { locale, role, step, ...formData } = await req.json();

  try {
    // Get current profile to merge existing preferences
    const { data: currentProfile, error: fetchError } = await client
      .from("profiles")
      .select("preferences, profile_completion")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching current profile:", fetchError);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    // Merge existing preferences with new onboarding data
    const existingPreferences = currentProfile?.preferences || {};
    const existingOnboarding = existingPreferences.onboarding || {};
    const newOnboardingData = { ...existingOnboarding, ...formData };

    // Update preferences with onboarding data
    const updatedPreferences = {
      ...existingPreferences,
      onboarding: newOnboardingData,
      interests: {
        broadField: formData.broadField || existingOnboarding.broadField,
        subFields: [
          ...(formData.developmentSubFields || []),
          ...(formData.businessSubFields || []),
          ...(formData.financeSubFields || []),
          ...(formData.itSubFields || []),
          ...(formData.designSubFields || []),
          ...(formData.marketingSubFields || []),
          ...(formData.personalDevSubFields || [])
        ].filter(Boolean)
      }
    };

    // Update profile with new preferences and onboarding step
    const profileUpdateData: any = {
      preferences: updatedPreferences,
      onboarded_step: step,
      updated_at: new Date().toISOString()
    };

    // Mark as onboarded if it's the last step
    if (step === 2) {
      profileUpdateData.onboarded = true;
      profileUpdateData.profile_completion = Math.min((currentProfile?.profile_completion || 0) + 30, 100);
    }

    const { error: profileUpdateError } = await client
      .from("profiles")
      .update(profileUpdateData)
      .eq("user_id", user.id);

    if (profileUpdateError) {
      console.error("Error updating profile:", profileUpdateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Also keep onboarding data in user_metadata for backward compatibility
    const { error: authUpdateError } = await client.auth.updateUser({
      data: { 
        onboarding: newOnboardingData,
        interests: updatedPreferences.interests
      },
    });

    if (authUpdateError) {
      console.error("Error updating auth metadata:", authUpdateError);
      // Don't fail the request if auth update fails, as profile update is more important
    }

    if (role) {
      revalidatePath(`/${locale}/${role.toLowerCase()}`);
    }

    return NextResponse.json({ 
      success: true, 
      onboardingData: newOnboardingData,
      interests: updatedPreferences.interests 
    });

  } catch (error) {
    console.error("Onboarding update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}