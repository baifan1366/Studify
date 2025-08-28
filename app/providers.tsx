"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const [locale, setLocale] = useState<string>("en");
  const [messages, setMessages] = useState<Record<string, string> | null>(null);

  // Dynamically detect locale & load messages
  useEffect(() => {
    const segments = pathname.split("/");
    const currentLocale = segments[1] || "en"; /

    setLocale(currentLocale);

    import(`@/messages/${currentLocale}.json`)
      .then((mod) => setMessages(mod.default))
      .catch(() => {
        console.error(`Missing translation file for locale: ${currentLocale}`);
        setMessages({});
      });
  }, [pathname]);

  if (!messages) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider>{children}</AuthProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
