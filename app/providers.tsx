"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState, useMemo, Suspense } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { FontSizeProvider } from "@/context/font-size-context";
import dynamic from "next/dynamic";

// Lazy load Toaster to reduce initial bundle
const Toaster = dynamic(() => import("sonner").then(mod => ({ default: mod.Toaster })), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<string>("en");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const segments = pathname.split("/");
    const currentLocale = segments[1] || "en";

    setLocale(currentLocale);

    // Use requestIdleCallback for non-critical translation loading
    const loadMessages = () => {
      import(`@/messages/${currentLocale}.json`)
        .then((mod) => {
          setMessages(mod.default);
          setIsLoading(false);
        })
        .catch(() => {
          console.error(`Missing translation file for locale: ${currentLocale}`);
          setMessages({});
          setIsLoading(false);
        });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadMessages);
    } else {
      setTimeout(loadMessages, 1);
    }
  }, [pathname]);

  // Show loading skeleton instead of null to prevent layout shift
  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      );
    }
    return children;
  }, [isLoading, children]);

  return (
    <ReactQueryProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider>
          <FontSizeProvider>
            {content}
            <Suspense fallback={null}>
              <Toaster
                richColors
                position="top-right"
                expand={true}
                toastOptions={{
                  style: { zIndex: 9999 },
                  className: "sonner-toast",
                }}
              />
            </Suspense>
          </FontSizeProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </ReactQueryProvider>
  );
}
