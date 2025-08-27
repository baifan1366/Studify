import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import React from 'react';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({children, params}: LocaleLayoutProps) {
  const { locale } = await params;  

  let messages: Record<string, string>;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
