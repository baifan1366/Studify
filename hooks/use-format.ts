import { useMemo } from "react";
import { useLocale } from "next-intl"; 
import {
  formatDate,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
} from "@/lib/formatters";

export function useFormat() {
  const locale = useLocale?.() || (typeof window !== "undefined" ? navigator.language : "en-US");

  return useMemo(
    () => ({
      formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
        formatDate(date, locale, options),

      formatCurrency: (amount: number, currency = "USD") =>
        formatCurrency(amount, locale, currency),

      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),

      formatRelativeTime: (date: Date | string) =>
        formatRelativeTime(date, locale),
    }),
    [locale]
  );
}