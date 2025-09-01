import { Metadata } from "next";
import CheckoutButton from "@/components/checkout-button";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('OrderPreviewPage');

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

interface PageProps {
  params: { locale: string };
}

export default async function OrderPreviewPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('OrderPreviewPage');

  const dummyItem = {
    name: "T-shirt",
    price: 2000,
    quantity: 1,
    image: "https://via.placeholder.com/150",
  };

  return (
    <div className="p-8">
      <h1>{t('page_title')}</h1>
      <p>{t('item_label')}{dummyItem.name}</p>
      <p>{t('price_label')}{dummyItem.price / 100}</p>

      <CheckoutButton items={[dummyItem]} locale={locale} />
    </div>
  );
}