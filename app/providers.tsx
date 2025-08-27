"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient once per app instance
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </QueryClientProvider>
  );
}
