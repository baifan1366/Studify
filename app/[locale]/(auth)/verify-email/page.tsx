"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useResendVerification } from "@/hooks/profile/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, Clock } from "lucide-react";

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
  const { toast } = useToast();
  const resendMutation = useResendVerification();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

    try {
      // Pass locale to the hook
      await resendMutation.mutateAsync({
        email,
        locale,
      });

      toast({
        title: "✅ " + t("resend_success_title"),
        description: t("resend_success_desc"),
        duration: 5000,
      });

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
      toast({
        title: "❌ " + t("resend_error_title"),
        description: error.message || t("resend_error_desc"),
        variant: "destructive",
      });
    }
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
            className="mb-4"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email_placeholder")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] dark:bg-gray-800 dark:text-gray-100"
            />
          </motion.div>
        )}

        {/* Resend Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleResend}
          disabled={resendMutation.isPending || resendCooldown > 0}
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
