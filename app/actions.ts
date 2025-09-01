"use server";

import { supabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { encodedRedirect, getRedirectUrlFromPath } from "@/utils/redirect";

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
    return encodedRedirect("error", `/${locale}/sign-in`, error.message);
  }

  const role = data.user?.user_metadata.role;
  const redirectUrl = getRedirectUrlFromPath(locale, role);
  return redirect(redirectUrl);
};

export const signUpStudent = signUp.bind(null, 'student');
export const signUpTutor = signUp.bind(null, 'tutor');

async function signUp(role: 'student' | 'tutor', formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const locale = formData.get("locale") as string;

  const client = await supabase();
  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });

  if (error) {
    const redirectUrl =
      role === "tutor"
        ? `/${locale}/tutor/sign-up`
        : `/${locale}/student/sign-up`;
    return encodedRedirect("error", redirectUrl, error.message);
  }

  const redirectUrl = getRedirectUrlFromPath(locale, role);
  return redirect(redirectUrl);
}