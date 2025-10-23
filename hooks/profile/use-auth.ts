"use client";

import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api-config";

export type UserRole = "student" | "tutor" | "admin";

type SignInArgs = { email: string; password: string; locale: string; captchaToken?: string; mode?: 'login' | 'add' | 'switch' };
type SignUpArgs = { email: string; password: string; fullName?: string; locale: string; role?: UserRole; captchaToken?: string };

type AuthResponse = {
  ok: boolean;
  userId: string;
  role: UserRole;
  name?: string;
  requiresConfirmation?: boolean;
  mode?: 'login' | 'add' | 'switch';
  accountInfo?: any;
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

// Resend Verification Email Hook
type ResendVerificationArgs = { 
  email: string;
  locale?: string;
  captchaToken?: string;
};
type ResendVerificationResponse = { 
  success: boolean; 
  message: string;
  error?: string;
  debug?: any;
};

export function useResendVerification() {
  return useMutation<ResendVerificationResponse, Error, ResendVerificationArgs>({
    mutationFn: async (vars) => {
      // Call the API endpoint instead of Supabase directly
      const response = await apiSend<ResendVerificationResponse>({
        url: '/api/auth/resend-verification',
        method: 'POST',
        body: {
          email: vars.email,
          locale: vars.locale,
          captchaToken: vars.captchaToken,
        },
      });

      return response;
    },
  });
}
