import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('RootPage');

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

export default function Page() {
  const t = useTranslations("HomePage");
  return <h1>{t("title")}</h1>;
}