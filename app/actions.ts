"use server";

import { supabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/redirect";
import { cookies } from "next/headers";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const locale = formData.get("locale") as string;

  const client = await supabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log("[signInAction] sign-in failed:", { email, error });
    return encodedRedirect("error", `/${locale}/sign-in`, error.message);
  }
  console.log("[signInAction] sign-in success:", {
    email,
    userId: data.user?.id,
    hasSession: Boolean(data.session),
  });
  return redirect(`/${locale}/home`);
};

export const signUpStudent = signUp.bind(null, "student");
export const signUpTutor = signUp.bind(null, "tutor");

async function signUp(role: "student" | "tutor", formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const locale = formData.get("locale") as string;

  const client = await supabase();

  const url = process.env.VERCEL_URL
    ? `${process.env.VERCEL_URL}/${locale}/home`
    : `http://localhost:3000/${locale}/home`;

  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });

  if (error) {
    const redirectUrl =
      role === "tutor" ? `/${locale}/sign-up-tutor` : `/${locale}/sign-up`;
    return encodedRedirect("error", redirectUrl, error.message);
  }

  return redirect(`/${locale}/home`);
}

export const signOutAction = async () => {
  const client = await supabase();
  await client.auth.signOut();

  const cookieStore = await cookies();
  const locale = cookieStore.get("next-intl-locale")?.value || "en";
  return redirect(`/${locale}/sign-in`);
};
