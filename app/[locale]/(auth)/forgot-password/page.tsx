import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ForgotPasswordForm from '@/components/auth/forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ForgotPasswordPage');
  
  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords'),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
