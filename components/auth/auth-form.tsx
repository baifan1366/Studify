"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Mail, Lock, User, Eye, EyeOff, GraduationCap, BookOpen } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignIn, useSignUp } from "@/hooks/profile/use-auth";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/utils/supabase/client";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useAccountSwitcher } from "@/hooks/auth/use-account-switcher";
import { useTranslations } from 'next-intl';
import MFAVerificationForm from "./mfa-verification-form";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const t = useTranslations('AuthSignInPage');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{email: string; password: string} | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);
  const { toast } = useToast();

  // CAPTCHA handlers
  const handleCaptchaVerify = (token: string) => {
    console.log('CAPTCHA verified:', token);
    setCaptchaToken(token);
    setError(null); // Clear any previous captcha errors
  };

  const handleCaptchaExpire = () => {
    console.log('CAPTCHA expired');
    setCaptchaToken(null);
  };

  const handleCaptchaError = (err: string) => {
    console.error('CAPTCHA error:', err);
    setCaptchaToken(null);
    setError('CAPTCHA verification failed. Please try again.');
  };

  // MFA handlers
  const handleMFAVerificationSuccess = (data: any) => {
    // Handle login success for account addition
    if (data.mode === 'add' || authMode === 'add') {
      handleLoginSuccess(data);
      
      // Show success message and redirect
      toast({
        title: "Account Added Successfully",
        description: "The account has been added to your account switcher.",
        duration: 3000,
      });
      
      // For account addition, redirect to specified URL or home
      const targetUrl = redirectUrl || `/${locale}/home`;
      setTimeout(() => router.replace(targetUrl), 1000);
    } else {
      // Normal login flow
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

  const handleRoleSelection = (selectedRole: 'student' | 'tutor') => {
    setShowRoleDialog(false);
    const signUpPath = selectedRole === 'student' ? `/${locale}/student/sign-up` : `/${locale}/tutor/sign-up`;
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
      console.log('Starting OAuth flow with Google');
      
      // Use auth callback endpoint for consistent session handling
      const currentOrigin = window.location.origin;
      let oauthRedirectUrl = `${currentOrigin}/api/auth/callback`;
      
      // Build query parameters for OAuth callback
      const params = new URLSearchParams();
      
      // Pass role information if available (from sign-up pages)
      if (role) {
        params.set('role', role);
      }
      
      // If adding new account, preserve the mode and redirect parameters
      if (authMode === 'add') {
        params.set('mode', 'add');
        if (redirectUrl) {
          params.set('redirect', redirectUrl);
        }
      }
      
      // Append params to redirect URL if any exist
      if (params.toString()) {
        oauthRedirectUrl += `?${params.toString()}`;
      }
      
      console.log('OAuth redirect URL:', oauthRedirectUrl, 'with role:', role);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirectUrl,
          queryParams: { 
            access_type: "offline",
            prompt: "consent"
          },
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        toast({ 
          title: "Google Login Failed", 
          description: error.message,
          variant: "destructive" 
        });
        setLoading(false);
      }
      // Note: setLoading(false) is not called on success because we're redirecting
    } catch (err) {
      console.error("OAuth error:", err);
      toast({ 
        title: "Google Login Failed", 
        description: "An unexpected error occurred",
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    // Check CAPTCHA verification
    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }
    
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
        const res = await signUp.mutateAsync({ 
          email, 
          password, 
          fullName, 
          locale, 
          role, 
          captchaToken 
        });
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
        
        // First attempt sign-in to check for MFA requirement
        try {
          const response = await fetch('/api/auth/sign-in', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              locale,
              captchaToken,
              mode: authMode === 'add' ? 'add' : 'login'
            }),
          });

          const data = await response.json();

          if (response.ok) {
            if (data.requiresMFA) {
              // Store credentials for MFA verification
              setLoginCredentials({ email, password });
              setRequiresMFA(true);
              setPending(false);
              return;
            }

            // Normal login success
            const res = data;
            
            // Handle login success for account addition
            if (res.mode === 'add' || authMode === 'add') {
              handleLoginSuccess(res);
              
              // Show success message and redirect
              toast({
                title: "Account Added Successfully",
                description: "The account has been added to your account switcher.",
                duration: 3000,
              });
              
              // For account addition, redirect to specified URL or home
              const targetUrl = redirectUrl || `/${locale}/home`;
              setTimeout(() => router.replace(targetUrl), 1000);
            } else {
              // Normal login flow
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
              // Store credentials for MFA verification
              setLoginCredentials({ email, password });
              setRequiresMFA(true);
              setPending(false);
              return;
            }
            throw new Error(data.error || 'Sign-in failed');
          }
        } catch (fetchError) {
          throw fetchError;
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed");
      // Reset CAPTCHA on error
      resetCaptcha();
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
                style={{width: "auto", height: "auto"}}
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
              <form onSubmit={onSubmit} className="space-y-6">
                <input type="hidden" name="locale" value={locale} />
                {children}

            {/* HCaptcha Component */}
            <div className="flex justify-center">
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={handleCaptchaVerify}
                onExpire={handleCaptchaExpire}
                onError={handleCaptchaError}
                theme={theme === 'dark' ? 'dark' : 'light'}
                size="normal"
              />
            </div>

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

          <div className="mt-2 text-center text-sm">
            {/* Hide Google login for add account mode */}
            {authMode !== 'add' && (
              <motion.button
                onClick={handleGoogleLogin}
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#E55F00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? "Loading..." : "Continue with Google"}
              </motion.button>
            )}    
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-300">{footerText} </span>
            {footerLinkHref ? (
              <Link
                href={footerLinkHref}
                className="font-medium text-[#FF6B00] hover:text-[#E55F00] dark:text-[#FF6B00] dark:hover:text-[#FF8C42] transition-colors duration-200"
              >
                {footerLinkText}
              </Link>
            ) : (
              <button
                onClick={handleFooterLinkClick}
                className="font-medium text-[#FF6B00] hover:text-[#E55F00] dark:text-[#FF6B00] dark:hover:text-[#FF8C42] transition-colors duration-200 underline"
              >
                {footerLinkText}
              </button>
            )}
          </div>
          
          {/* Show message for add account mode */}
          {authMode === 'add' && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-[#FF6B00] dark:text-[#FF6B00] text-center">
                {t('add_account_notice')}
              </p>
            </div>
          )}
            </>
          )}
        </motion.div>

        {/* Role Selection Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">{t('choose_account_type')}</DialogTitle>
              <DialogDescription className="text-center">
                {t('select_account_type_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelection('student')}
                className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#FF6B00] dark:hover:border-[#FF6B00] transition-colors duration-200 group"
              >
                <BookOpen className="h-12 w-12 text-gray-400 group-hover:text-[#FF6B00] transition-colors duration-200" />
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#FF6B00] transition-colors duration-200">
                  {t('student')}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('student_description')}
                </p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelection('tutor')}
                className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#FF6B00] dark:hover:border-[#FF6B00] transition-colors duration-200 group"
              >
                <GraduationCap className="h-12 w-12 text-gray-400 group-hover:text-[#FF6B00] transition-colors duration-200" />
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#FF6B00] transition-colors duration-200">
                  {t('tutor')}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('tutor_description')}
                </p>
              </motion.button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
