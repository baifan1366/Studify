"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Smartphone, ExternalLink } from "lucide-react";

/**
 * Mobile Redirect Page
 * 
 * This page serves as a fallback for email verification and password reset
 * when Android App Links don't work. It attempts to open the app using
 * a custom URL scheme and provides a manual button if needed.
 */
function MobileRedirectContent() {
  const searchParams = useSearchParams();
  const [showManualButton, setShowManualButton] = useState(false);
  const [deepLink, setDeepLink] = useState("");

  useEffect(() => {
    // Get all parameters from the URL
    const params = new URLSearchParams(searchParams.toString());
    
    // Build deep link with all parameters
    const link = `studify://auth-callback?${params.toString()}`;
    setDeepLink(link);
    
    console.log("[MOBILE REDIRECT] Attempting to open app with:", link);
    
    // Try to open the app immediately
    window.location.href = link;
    
    // Show manual button after 3 seconds if still on page
    const timer = setTimeout(() => {
      console.log("[MOBILE REDIRECT] Auto-open timeout, showing manual button");
      setShowManualButton(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleOpenApp = () => {
    console.log("[MOBILE REDIRECT] Manual open triggered");
    window.location.href = deepLink;
  };

  const handleOpenInBrowser = () => {
    // Redirect to the web version of the callback
    const params = new URLSearchParams(searchParams.toString());
    const webUrl = `/api/auth/callback?${params.toString()}`;
    console.log("[MOBILE REDIRECT] Opening in browser:", webUrl);
    window.location.href = webUrl;
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-[#FDF5E6] dark:bg-[#0D1F1A]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          正在打开应用...
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {showManualButton 
            ? "如果应用没有自动打开，请点击下方按钮"
            : "请稍候，正在尝试打开 Studify 应用"}
        </p>

        {/* Loading spinner */}
        {!showManualButton && (
          <div className="flex justify-center mb-6">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Manual buttons */}
        {showManualButton && (
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleOpenApp}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B00] hover:bg-[#E55F00] text-white rounded-lg font-medium transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              打开 Studify 应用
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={handleOpenInBrowser}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              在浏览器中继续
            </motion.button>
          </div>
        )}

        {/* Help text */}
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          如果遇到问题，请确保已安装最新版本的 Studify 应用
        </p>
      </motion.div>
    </div>
  );
}

export default function MobileRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-[#FDF5E6] dark:bg-[#0D1F1A]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
            <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            正在加载...
          </h1>
          <div className="flex justify-center mb-6">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    }>
      <MobileRedirectContent />
    </Suspense>
  );
}
