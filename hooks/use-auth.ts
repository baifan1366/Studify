"use client";

import { useMutation } from "@tanstack/react-query";

export type UserRole = "student" | "tutor" | "admin";

type SignInArgs = { email: string; password: string; locale: string };

type SignUpArgs = { email: string; password: string; fullName?: string; locale: string; role?: UserRole };

type AuthResponse = { ok: boolean; userId: string; role: UserRole; name?: string; requiresConfirmation?: boolean };

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      msg = data?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function useSignIn() {
  return useMutation<AuthResponse, Error, SignInArgs>({
    mutationFn: (vars) => postJson<AuthResponse>("/api/auth/sign-in", vars),
  });
}

export function useSignUp() {
  return useMutation<AuthResponse, Error, SignUpArgs>({
    mutationFn: (vars) => postJson<AuthResponse>(`/api/auth/sign-up${vars.role ? `?role=${vars.role}` : ""}`, vars),
  });
}
