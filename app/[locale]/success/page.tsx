import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations('SuccessPage');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function SuccessPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('SuccessPage');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-2">
        {t('payment_successful_heading')}
      </h1>
    </div>
  );
}