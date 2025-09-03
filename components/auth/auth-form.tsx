"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignIn, useSignUp } from "@/hooks/profile/use-auth";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

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

  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg bg-indigo-600/80 dark:bg-indigo-700/80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen flex items-center justify-center p-4 bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image 
                src="/favicon.png" 
                alt="Logo" 
                width={64} 
                height={64} 
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#222] dark:text-[#F1F5F9] mb-2 transition-colors duration-200">
            {title}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 transition-colors duration-200">{subtitle}</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 dark:bg-[#0D1F1A] rounded-2xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:border dark:border-gray-700/50 p-8 backdrop-blur-sm transition-colors duration-300"
        >
          <form onSubmit={onSubmit} className="space-y-6">
            <input type="hidden" name="locale" value={locale} />
            {children}

            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={pending}
              whileTap={{ scale: 0.98 }}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#E55F00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {pending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                buttonText
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-300">{footerText} </span>
            <Link 
              href={footerLinkHref} 
              className="font-medium text-[#FF6B00] hover:text-[#E55F00] dark:text-[#FF6B00] dark:hover:text-[#FF8C42] transition-colors duration-200"
            >
              {footerLinkText}
            </Link>
          </div>
        </motion.div>

        <div className="mt-6 flex justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
