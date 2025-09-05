import { useMemo } from "react";
import { useLocale } from "next-intl"; 
import {
  formatDate,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
  formatDuration,
  formatPrice,
  formatCompactDate,
} from "@/lib/formatters";

export function useFormat() {
  const locale = useLocale?.() || (typeof window !== "undefined" ? navigator.language : "en-US");

  return useMemo(
    () => ({
      formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
        formatDate(date, locale, options),

      formatCompactDate: (date: Date | string) =>
        formatCompactDate(date, locale),

      formatCurrency: (amount: number, currency = "USD") =>
        formatCurrency(amount, locale, currency),

      formatPrice: (priceCents: number, currency: string, isFree: boolean) =>
        formatPrice(priceCents, currency, isFree, locale),

      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),

      formatDuration: (minutes?: number) =>
        formatDuration(minutes),

      formatRelativeTime: (date: Date | string) =>
        formatRelativeTime(date, locale),
    }),
    [locale]
  );
}