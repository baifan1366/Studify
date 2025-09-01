"use server";

import { supabase } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveStudentOnboardingStep(
  step: number,
  locale: string, // 👈 added locale param
  formData: FormData
) {
  const client = await supabase();
  const { data: { user }} = await client.auth.getUser(); // fix this or find solution

  if (!user) {
    throw new Error("User not found");
  }

  const onboardingData = user.user_metadata.onboarding || {};

  // Save data based on step
  if (step === 1) {
    onboardingData.fullName = formData.get("fullName");
  } else if (step === 2) {
    onboardingData.learningGoals = formData.getAll("learningGoals");
  }

  const { error } = await client.auth.updateUser({
    data: { onboarding: onboardingData },
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${locale}/onboarding/student`);
}

export async function saveTutorOnboardingStep(
  step: number,
  locale: string, // 👈 added locale param
  formData: FormData
) {  
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const onboardingData = user.user_metadata.onboarding || {};

  // Save data based on step
  if (step === 1) {
    onboardingData.fullName = formData.get("fullName");
  } else if (step === 2) {
    onboardingData.qualifications = formData.get("qualifications");
    onboardingData.experience = formData.get("experience");
  } else if (step === 3) {
    onboardingData.hourlyRate = formData.get("hourlyRate");
    onboardingData.availability = formData.getAll("availability");
  }

  const { error } = await client.auth.updateUser({
    data: { onboarding: onboardingData },
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${locale}/onboarding/tutor`);
}
