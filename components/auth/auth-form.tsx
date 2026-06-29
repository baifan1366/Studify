"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Brain,
  Video,
  Users,
  Award,
  Sparkles,
  Flame,
  MessageSquare,
  Play,
  Trophy
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignIn, useSignUp } from "@/hooks/profile/use-auth";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/utils/supabase/client";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useAccountSwitcher } from "@/hooks/auth/use-account-switcher";
import { useTranslations } from "next-intl";
import MFAVerificationForm from "./mfa-verification-form";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isCapacitor } from "@/utils/platform";

// HCaptcha configuration
const HCAPTCHA_SITE_KEY = "d26a2d9a-3b10-4210-86a6-c8e4d872db56";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  role?: "student" | "tutor" | "admin";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  buttonText: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref?: string;
  locale: string;
  authMode?: string;
  redirectUrl?: string;
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
  authMode,
  redirectUrl,
}: AuthFormProps) {
  const router = useRouter();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const { handleLoginSuccess } = useAccountSwitcher();
  const t = useTranslations("AuthSignInPage");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);
  const { toast } = useToast();

  // CAPTCHA handlers
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setError(null);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleCaptchaError = (err: string) => {
    console.error("CAPTCHA error:", err);
    setCaptchaToken(null);
    setError("CAPTCHA verification failed. Please try again.");
  };

  // MFA handlers
  const handleMFAVerificationSuccess = (data: any) => {
    if (data.mode === "add" || authMode === "add") {
      handleLoginSuccess(data);
      toast({
        title: "Account Added Successfully",
        description: "The account has been added to your account switcher.",
        duration: 3000,
      });
      const targetUrl = redirectUrl || `/${locale}/home`;
      setTimeout(() => router.replace(targetUrl), 1000);
    } else {
      const r = data.role;
      const pathByRole: Record<typeof r, string> = {
        student: `/${locale}/home`,
        tutor: `/${locale}/tutor/dashboard`,
        admin: `/${locale}/admin/dashboard`,
      } as const;
      router.replace(pathByRole[r]);
    }
  };

  const handleMFABackToLogin = () => {
    setRequiresMFA(false);
    setLoginCredentials(null);
    setError(null);
  };

  const handleFooterLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowRoleDialog(true);
  };

  const handleRoleSelection = (selectedRole: "student" | "tutor") => {
    setShowRoleDialog(false);
    const signUpPath =
      selectedRole === "student"
        ? `/${locale}/student/sign-up`
        : `/${locale}/tutor/sign-up`;
    router.push(signUpPath);
  };

  const resetCaptcha = () => {
    if (captchaRef.current) {
      captchaRef.current.resetCaptcha();
    }
    setCaptchaToken(null);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      console.log("Starting OAuth flow with Google", { role, authMode });
      const isMobile = isCapacitor();
      const siteUrl = window.location.origin;
      const callbackUrl = new URL(`${siteUrl}/api/auth/callback`);

      if (role) {
        callbackUrl.searchParams.set("role", role);
      }
      if (authMode === "add") {
        callbackUrl.searchParams.set("mode", "add");
        if (redirectUrl) {
          callbackUrl.searchParams.set("redirect", redirectUrl);
        }
      }
      callbackUrl.searchParams.set("next", `/${locale}`);

      const oauthOptions = {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          role: role || "student",
        },
      };
      
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: oauthOptions,
      });

      if (error) {
        toast({
          title: "Google Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (err) {
      toast({
        title: "Google Login Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const fullName = (form.get("fullName") as string) || undefined;
    const confirmPassword =
      (form.get("confirmPassword") as string) || undefined;

    try {
      if (mode === "sign-up") {
        if (!email || !password)
          throw new Error("Email and password are required");
        if (confirmPassword !== undefined && confirmPassword !== password) {
          throw new Error("Passwords do not match");
        }
        const res = await signUp.mutateAsync({
          email,
          password,
          fullName,
          locale,
          role,
          captchaToken,
        });
        if (res.requiresConfirmation) {
          router.replace(`/${locale}/verify-email`);
          return;
        }
        const r = res.role;
        const pathByRole: Record<typeof r, string> = {
          student: `/${locale}/home`,
          tutor: `/${locale}/tutor/dashboard`,
          admin: `/${locale}/admin/dashboard`,
        } as const;
        router.replace(pathByRole[r]);
      } else {
        if (!email || !password)
          throw new Error("Email and password are required");

        try {
          const response = await fetch("/api/auth/sign-in", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
              locale,
              captchaToken,
              mode: authMode === "add" ? "add" : "login",
            }),
          });

          const data = await response.json();

          if (response.ok) {
            if (data.requiresMFA) {
              setLoginCredentials({ email, password });
              setRequiresMFA(true);
              setPending(false);
              return;
            }

            const res = data;
            if (res.mode === "add" || authMode === "add") {
              handleLoginSuccess(res);
              toast({
                title: "Account Added Successfully",
                description:
                  "The account has been added to your account switcher.",
                duration: 3000,
              });
              const targetUrl = redirectUrl || `/${locale}/home`;
              setTimeout(() => router.replace(targetUrl), 1000);
            } else {
              const r = res.role;
              const pathByRole: Record<typeof r, string> = {
                student: `/${locale}/home`,
                tutor: `/${locale}/tutor/dashboard`,
                admin: `/${locale}/admin/dashboard`,
              } as const;
              router.replace(pathByRole[r]);
            }
          } else {
            if (data.requiresMFA) {
              setLoginCredentials({ email, password });
              setRequiresMFA(true);
              setPending(false);
              return;
            }
            throw new Error(data.error || "Sign-in failed");
          }
        } catch (fetchError) {
          throw fetchError;
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed");
      resetCaptcha();
    } finally {
      setPending(false);
    }
  }

  const { resolvedTheme } = useTheme();
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
    <div className="min-h-screen w-full flex overflow-hidden bg-[#fffaf2] text-slate-950 transition-colors duration-300 dark:bg-[#0D1F1A] dark:text-slate-50 lg:grid lg:grid-cols-12">
      
      {/* Left Column: Visual Carousel (Desktop Only, takes 5 cols) */}
      <div className="relative hidden overflow-hidden border-r border-orange-200/70 bg-gradient-to-b from-[#fffdf8] via-[#fff4df] to-[#f4f8ef] p-12 text-slate-950 shadow-[inset_-1px_0_0_rgba(255,107,0,0.04)] dark:border-white/5 dark:from-[#051410] dark:via-[#081B16] dark:to-[#051410] dark:text-slate-50 lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:32px_32px] text-primary pointer-events-none" />
        
        {/* Glow objects */}
        <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-[85px] animate-pulse" />
        <div className="absolute -right-12 bottom-12 h-80 w-80 rounded-full bg-emerald-500/5 blur-[100px]" />

        {/* Branding header */}
        <Link 
          href={`/${locale}`}
          className="relative z-10 flex items-center gap-3 group active:scale-95 transition"
        >
          <Image
            src="/favicon.png"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
          <span className="text-xl font-black tracking-wider text-current">
            STUDIFY
          </span>
        </Link>

        {/* Visual Slider Carousel */}
        <AuthVisualCarousel />

        {/* Left Side Footer */}
        <div className="relative z-10 font-mono text-[10px] text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} Studify Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form Container (takes 7 cols on desktop, full width on mobile) */}
      <div className="flex-1 lg:col-span-7 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto min-h-screen">
        {/* Decorative elements for mobile view */}
        <div className="absolute -left-48 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none lg:hidden" />
        <div className="absolute -right-48 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-md relative z-10">
          
          {/* Header Mobile Only */}
          <div className="text-center mb-8 lg:mb-10">
            <div className="flex justify-center mb-4 lg:hidden">
              <Link href={`/${locale}`} className="active:scale-95 transition">
                <Image
                  src="/favicon.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
            
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Form Card Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card/45 dark:bg-[#122A22]/50 border border-border/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl transition-colors duration-300"
          >
            {requiresMFA && loginCredentials ? (
              <MFAVerificationForm
                email={loginCredentials.email}
                password={loginCredentials.password}
                onVerificationSuccess={handleMFAVerificationSuccess}
                onBack={handleMFABackToLogin}
                mode={authMode}
                redirectUrl={redirectUrl}
              />
            ) : (
              <>
                <form onSubmit={onSubmit} className="space-y-5">
                  <input type="hidden" name="locale" value={locale} />
                  {children}

                  {/* HCaptcha Box */}
                  <div className="flex justify-center pt-2">
                    <div className="p-1.5 bg-slate-900/10 dark:bg-black/20 border border-border/10 rounded-2xl shadow-inner backdrop-blur-sm">
                      <HCaptcha
                        ref={captchaRef}
                        sitekey={HCAPTCHA_SITE_KEY}
                        onVerify={handleCaptchaVerify}
                        onExpire={handleCaptchaExpire}
                        onError={handleCaptchaError}
                        theme={resolvedTheme === "dark" ? "dark" : "light"}
                        size="normal"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl font-medium"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={pending}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/10 text-sm font-bold text-white bg-primary hover:bg-[#E55F00] active:scale-98 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
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

                {/* Divider */}
                {authMode !== "add" && (
                  <div className="relative flex items-center my-6 text-xs uppercase">
                    <div className="flex-1 border-t border-border/10" />
                    <span className="px-3 text-muted-foreground/60 font-medium whitespace-nowrap">Or continue with</span>
                    <div className="flex-1 border-t border-border/10" />
                  </div>
                )}

                {/* OAuth Google Button */}
                {authMode !== "add" && (
                  <motion.button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-border bg-background hover:bg-muted/40 text-sm font-bold text-foreground rounded-xl shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-98"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {/* Custom Google Color Icon SVG */}
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.97 1 12 1 7.37 1 3.4 3.66 1.45 7.55l3.85 2.99C6.22 7.23 8.89 5.04 12 5.04z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.45 12.3c0-.82-.07-1.6-.22-2.3H12v4.35h6.42c-.28 1.44-1.09 2.66-2.32 3.48l3.6 2.79c2.1-1.94 3.75-4.8 3.75-8.32z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.3 14.46c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.45 7.1c-.9 1.8-1.42 3.82-1.42 5.9 0 2.08.52 4.1 1.42 5.9l3.85-2.99s-.03-.42-.03-.45z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.79c-1 .67-2.28 1.07-3.95 1.07-3.11 0-5.78-2.19-6.72-5.5l-3.85 2.99C3.4 20.34 7.37 23 12 23z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* Footer redirection link */}
                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    {footerText}{" "}
                  </span>
                  {footerLinkHref ? (
                    <Link
                      href={footerLinkHref}
                      className="font-bold text-primary hover:text-[#E55F00] transition-colors"
                    >
                      {footerLinkText}
                    </Link>
                  ) : (
                    <button
                      onClick={handleFooterLinkClick}
                      className="font-bold text-primary hover:text-[#E55F00] transition-colors underline cursor-pointer"
                    >
                      {footerLinkText}
                    </button>
                  )}
                </div>

                {/* Add account notice if mode is add */}
                {authMode === "add" && (
                  <div className="mt-5 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-xs text-blue-400 leading-relaxed text-center font-medium">
                      {t("add_account_notice")}
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>

        </div>
      </div>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md border border-border/10 bg-card/95 backdrop-blur-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-foreground">
              {t("choose_account_type")}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {t("select_account_type_description")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.02, border: "2px solid #FF6B00" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelection("student")}
              className="flex flex-col items-center p-6 border-2 border-border/10 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 group cursor-pointer"
            >
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition duration-300">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-foreground group-hover:text-primary transition">
                {t("student")}
              </h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground text-center leading-normal">
                {t("student_description")}
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, border: "2px solid #FF6B00" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelection("tutor")}
              className="flex flex-col items-center p-6 border-2 border-border/10 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 group cursor-pointer"
            >
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition duration-300">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-foreground group-hover:text-primary transition">
                {t("tutor")}
              </h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground text-center leading-normal">
                {t("tutor_description")}
              </p>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// Subcomponent: Auth Page Visual Carousel Panel
// ==========================================
const CAROUSEL_SLIDES = [
  {
    icon: Brain,
    title: "Personalized AI Coach",
    desc: "Stuck on a topic? Ask AI to explain, generate flashcards, and guide you 24/7.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    accentColor: "#FF6B00",
    previewType: "chat"
  },
  {
    icon: Video,
    title: "Video Q&A Search",
    desc: "Search query transcripts and jump straight to timestamps in your course lectures.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    accentColor: "#3B82F6",
    previewType: "video"
  },
  {
    icon: Users,
    title: "Collaborative Classrooms",
    desc: "Draw on co-sync whiteboards and work together in collaborative audio study rooms.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    accentColor: "#10B981",
    previewType: "class"
  },
  {
    icon: Award,
    title: "Habit-Building Loops",
    desc: "Keep the momentum going with study streaks, level milestones, and mastery badges.",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    accentColor: "#8B5CF6",
    previewType: "badge"
  }
];

function AuthVisualCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = CAROUSEL_SLIDES[activeIndex];
  const Icon = slide.icon;

  return (
    <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm mt-12 mb-12">
      {/* Visual Mockup Display */}
      <div className="relative mb-10 flex h-[180px] w-full items-center justify-center overflow-hidden rounded-2xl border border-orange-200/70 bg-white/80 p-4 shadow-xl shadow-orange-950/5 dark:border-white/5 dark:bg-slate-950/80 dark:shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.previewType}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col justify-center items-center font-mono text-[10px]"
          >
            {slide.previewType === "chat" && (
              <div className="w-full max-w-[240px] space-y-2">
                <div className="flex justify-end">
                  <div className="bg-primary text-white rounded-lg rounded-tr-none px-2 py-1">
                    Explain gradients?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg rounded-tl-none border border-slate-200 bg-slate-100 px-2 py-1 text-slate-600 dark:border-white/5 dark:bg-white/10 dark:text-muted-foreground">
                    Gradients point in the direction of steepest ascent...
                  </div>
                </div>
              </div>
            )}

            {slide.previewType === "video" && (
              <div className="flex w-full max-w-[200px] flex-col gap-2 rounded-lg border border-blue-500/20 bg-blue-50 p-2 dark:bg-slate-900">
                <div className="flex h-10 items-center justify-center rounded bg-blue-100 text-blue-600 dark:bg-black/40 dark:text-blue-400">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div className="relative h-1 rounded bg-blue-200 dark:bg-slate-800">
                  <div className="absolute top-0 left-0 h-full w-[45%] bg-blue-500 rounded" />
                  <div className="absolute top-1/2 left-[45%] -translate-y-1/2 h-2 w-2 rounded-full bg-white" />
                </div>
              </div>
            )}

            {slide.previewType === "class" && (
              <div className="flex w-full max-w-[200px] flex-col gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50 p-2 dark:bg-[#09100E]">
                <div className="flex justify-between text-[7px] text-muted-foreground">
                  <span>WHITEBOARD</span>
                  <span className="text-emerald-400">● Live</span>
                </div>
                <svg className="w-full h-12" viewBox="0 0 100 30">
                  <motion.path 
                    d="M 5,20 Q 40,20 50,10 T 95,5" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </svg>
              </div>
            )}

            {slide.previewType === "badge" && (
              <div className="flex flex-col items-center gap-1.5">
                <motion.div 
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 flex items-center justify-center border border-yellow-300 shadow-md shadow-yellow-500/20"
                >
                  <Trophy className="h-6 w-6" />
                </motion.div>
                <span className="text-[8px] text-amber-400 uppercase tracking-widest font-black">Calculator Master</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Info Slide Card */}
      <div className="min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${slide.bgColor} ${slide.color} flex items-center justify-center`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {slide.title}
              </h3>
            </div>
            
            <p className="text-xs leading-relaxed text-slate-600 dark:text-muted-foreground">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bullet Dot Indicators */}
      <div className="flex items-center gap-1.5 mt-6">
        {CAROUSEL_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
