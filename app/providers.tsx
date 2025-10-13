"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { FontSizeProvider } from "@/context/font-size-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<string>("en");
  const [messages, setMessages] = useState<Record<string, string> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const segments = pathname.split("/");
    const currentLocale = segments[1] || "en";

    setLocale(currentLocale);

    import(`@/messages/${currentLocale}.json`)
      .then((mod) => setMessages(mod.default))
      .catch(() => {
        console.error(`Missing translation file for locale: ${currentLocale}`);
        setMessages({});
      });
  }, [pathname]);

  // if messages not loaded, return null
  if (!messages) return null;

  return (
    <ReactQueryProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider>
          <FontSizeProvider>
            {children}
            {mounted && (
              <Toaster
                richColors
                position="top-right"
                expand={true}
                toastOptions={{
                  style: { zIndex: 9999 },
                  className: "sonner-toast",
                }}
              />
            )}
          </FontSizeProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </ReactQueryProvider>
  );
}
