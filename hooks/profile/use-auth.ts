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
};
type ResendVerificationResponse = { success: boolean; message: string };

export function useResendVerification() {
  return useMutation<ResendVerificationResponse, Error, ResendVerificationArgs>({
    mutationFn: async (vars) => {
      const { supabase } = await import("@/utils/supabase/client");
      
      // Construct redirect URL with locale
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const locale = vars.locale || 'en';
      const emailRedirectTo = `${siteUrl}/${locale}/sign-in`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: vars.email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, message: 'Verification email sent successfully' };
    },
  });
}
