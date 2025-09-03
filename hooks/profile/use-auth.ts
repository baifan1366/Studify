"use client";

import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api-config";

export type UserRole = "student" | "tutor" | "admin";

type SignInArgs = { email: string; password: string; locale: string };
type SignUpArgs = { email: string; password: string; fullName?: string; locale: string; role?: UserRole };

type AuthResponse = {
  ok: boolean;
  userId: string;
  role: UserRole;
  name?: string;
  requiresConfirmation?: boolean;
};

// Sign In Hook
export function useSignIn() {
  return useMutation<AuthResponse, Error, SignInArgs>({
    mutationFn: (vars) => apiSend<AuthResponse>({
      url: "/api/auth/sign-in", 
      method: "POST", 
      body: vars,
      credentials: 'include',
    }),
  });
}

// Sign Up Hook
export function useSignUp() {
  return useMutation<AuthResponse, Error, SignUpArgs>({
    mutationFn: (vars) =>
      apiSend<AuthResponse>({
        url: `/api/auth/sign-up${vars.role ? `?role=${vars.role}` : ""}`,
        method: "POST",
        body: vars
    }),
  });
}
