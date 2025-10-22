"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useResendVerification } from "@/hooks/profile/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, Clock } from "lucide-react";
import HCaptchaComponent from "@/components/auth/hcaptcha-component";

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations("VerifyEmailPage");
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { toast } = useToast();
  const resendMutation = useResendVerification();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const captchaRef = useRef<any>(null);

  // Get hCaptcha site key from environment
  const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleResend = async () => {
    if (!email && !showEmailInput) {
      setShowEmailInput(true);
      return;
    }

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: t("captcha_required_title"),
        description: t("captcha_required_desc"),
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[VERIFY EMAIL] Attempting to resend verification email:', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        locale,
        hasCaptchaToken: !!captchaToken,
      });

      // Pass locale and captcha token to the hook
      const result = await resendMutation.mutateAsync({
        email,
        locale,
        captchaToken,
      });

      console.log('[VERIFY EMAIL] ✅ Resend successful:', result);

      // Check if email was already verified
      if (result.error === 'Email already verified') {
        toast({
          title: "ℹ️ Already Verified",
          description: "This email is already verified. You can sign in directly.",
          duration: 5000,
        });
        return;
      }

      toast({
        title: "✅ " + t("resend_success_title"),
        description: t("resend_success_desc"),
        duration: 5000,
      });

      // Log debugging info in development
      if (process.env.NODE_ENV === 'development' && result.debug) {
        console.log('[VERIFY EMAIL] Debug info:', result.debug);
      }

      // Reset captcha
      setCaptchaToken(null);
      if (captchaRef.current?.reset) {
        captchaRef.current.reset();
      }

      // Set cooldown for 60 seconds
      setResendCooldown(60);

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start new countdown
      intervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('[VERIFY EMAIL] ❌ Resend failed:', {
        error: error.message,
        stack: error.stack,
      });

      // Handle specific error types
      let errorTitle = t("resend_error_title");
      let errorDesc = error.message || t("resend_error_desc");

      if (error.message?.includes('Rate limit')) {
        errorTitle = "⏱️ Rate Limit";
        errorDesc = "Too many requests. Please wait a few minutes.";
      } else if (error.message?.includes('Email service')) {
        errorTitle = "📧 Email Service Error";
        errorDesc = "Email service may not be configured. Please contact support.";
      }

      toast({
        title: "❌ " + errorTitle,
        description: errorDesc,
        variant: "destructive",
        duration: 7000,
      });
      
      // Reset captcha on error
      setCaptchaToken(null);
      if (captchaRef.current?.reset) {
        captchaRef.current.reset();
      }
    }
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
    toast({
      title: t("captcha_error_title"),
      description: t("captcha_error_desc"),
      variant: "destructive",
    });
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 dark:bg-[#0D1F1A] rounded-2xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:border dark:border-gray-700/50 p-8 backdrop-blur-sm transition-colors duration-300 text-center max-w-md w-full"
      >
        {/* Logo */}
        <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
          <img
            src="/favicon.png"
            alt="Studify Logo"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2 text-[#222] dark:text-[#F1F5F9]">
          {t("title")}
        </h1>

        {/* Description */}
        <p className="text-[#555] dark:text-[#E5E7EB] mb-6">
          {t("description")}
        </p>

        {/* Email Input */}
        {showEmailInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 space-y-4"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email_placeholder")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] dark:bg-gray-800 dark:text-gray-100"
            />
            
            {/* hCaptcha */}
            <div className="flex justify-center">
              <HCaptchaComponent
                ref={captchaRef}
                siteKey={HCAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
                onError={handleCaptchaError}
                theme="light"
                size="normal"
              />
            </div>
          </motion.div>
        )}

        {/* Resend Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleResend}
          disabled={resendMutation.isPending || resendCooldown > 0 || (showEmailInput && !captchaToken)}
          className="w-full mb-4 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#FF6B00] hover:bg-[#E55F00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {resendMutation.isPending ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t("resending")}</span>
            </>
          ) : resendCooldown > 0 ? (
            <>
              <Clock className="w-4 h-4" />
              <span>
                {t("resend_cooldown")} {resendCooldown}s
              </span>
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              <span>{t("resend_button")}</span>
            </>
          )}
        </motion.button>

        {/* Tips */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2 font-medium">
            {t("tips_title")}
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>{t("tip_1")}</li>
            <li>{t("tip_2")}</li>
            <li>{t("tip_3")}</li>
          </ul>
        </div>

        {/* Sign In Link */}
        <p className="text-sm text-[#555] dark:text-[#E5E7EB]">
          {t("already_confirmed")}{" "}
          <Link
            href={`/${locale}/sign-in`}
            className="text-[#FF6B00] hover:text-[#E05E00] font-medium transition-colors"
          >
            {t("sign_in_link")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
