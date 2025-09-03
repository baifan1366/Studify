"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@/hooks/profile/use-auth";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  role?: "student" | "tutor" | "admin";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  buttonText: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
  locale: string;
}

export function AuthForm({
  mode,
  role,
  title,
  subtitle,
  children,
  buttonText,
  footerText,
  footerLinkText,
  footerLinkHref,
  locale,
}: AuthFormProps) {
  const router = useRouter();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const fullName = (form.get("fullName") as string) || undefined;
    const confirmPassword = (form.get("confirmPassword") as string) || undefined;
    try {
      if (mode === "sign-up") {
        if (!email || !password) throw new Error("Email and password are required");
        if (confirmPassword !== undefined && confirmPassword !== password) {
          throw new Error("Passwords do not match");
        }
        const res = await signUp.mutateAsync({ email, password, fullName, locale, role });
        if (res.requiresConfirmation) {
          router.replace(`/${locale}/verify-email`);
          return;
        }
        // Redirect based on role
        const r = res.role;
        const pathByRole: Record<typeof r, string> = {
          student: `/${locale}/home`,
          tutor: `/${locale}/tutor/dashboard`,
          admin: `/${locale}/admin/dashboard`,
        } as const;
        router.replace(pathByRole[r]);
      } else {
        if (!email || !password) throw new Error("Email and password are required");
        const res = await signIn.mutateAsync({ email, password, locale });
        const r = res.role;
        const pathByRole: Record<typeof r, string> = {
          student: `/${locale}/home`,
          tutor: `/${locale}/tutor/dashboard`,
          admin: `/${locale}/admin/dashboard`,
        } as const;
        router.replace(pathByRole[r]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-[420px] p-6 m-auto">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold">ST</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 text-sm">{subtitle}</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-8 mt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />
          {children}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {pending ? "..." : buttonText}
          </button>
        </form>

        {error && (
          <div className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">{footerText} </span>
          <Link href={footerLinkHref} className="text-[#7C3AED] hover:text-[#6025DD] font-medium">
            {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
}
