"use server";

import { supabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/redirect";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const client = await supabase();

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string;
  const client = await supabase();

  const url = process.env.VERCEL_URL
    ? `${process.env.VERCEL_URL}/protected`
    : "http://localhost:3000/protected";

  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: url,
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) {
    const redirectUrl = role === 'tutor' ? '/sign-up-tutor' : '/sign-up';
    return encodedRedirect("error", redirectUrl, error.message);
  }

  return redirect("/protected");
};

export const signOutAction = async () => {
  const client = await supabase();
  await client.auth.signOut();
  return redirect("/sign-in");
};
