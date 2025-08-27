const dateTimeCache = new Map<string, Intl.DateTimeFormat>();
const numberCache = new Map<string, Intl.NumberFormat>();
const relativeTimeCache = new Map<string, Intl.RelativeTimeFormat>();

export function formatDate(
  date: Date | string,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions
) {
  const d = typeof date === "string" ? new Date(date) : date;
  const key = `${locale}-${JSON.stringify(options)}`;

  if (!dateTimeCache.has(key)) {
    dateTimeCache.set(
      key,
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options,
      })
    );
  }

  return dateTimeCache.get(key)!.format(d);
}

export function formatCurrency(
  amount: number,
  locale = "en-US",
  currency = "USD"
) {
  const key = `${locale}-${currency}-currency`;
  if (!numberCache.has(key)) {
    numberCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      })
    );
  }
  return numberCache.get(key)!.format(amount);
}

export function formatNumber(
  value: number,
  locale = "en-US",
  options?: Intl.NumberFormatOptions
) {
  const key = `${locale}-${JSON.stringify(options)}`;
  if (!numberCache.has(key)) {
    numberCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberCache.get(key)!.format(value);
}

export function formatRelativeTime(
  targetDate: Date | string,
  locale = "en-US"
) {
  const now = new Date();
  const date = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const diffInSeconds = (date.getTime() - now.getTime()) / 1000;

  if (!relativeTimeCache.has(locale)) {
    relativeTimeCache.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: "auto" }));
  }

  const rtf = relativeTimeCache.get(locale)!;

  if (Math.abs(diffInSeconds) < 60) return rtf.format(Math.round(diffInSeconds), "seconds");
  if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.round(diffInSeconds / 60), "minutes");
  if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.round(diffInSeconds / 3600), "hours");
  return rtf.format(Math.round(diffInSeconds / 86400), "days");
}
