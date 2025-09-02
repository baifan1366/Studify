import Link from "next/link";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations('VerifyEmailPage');
  return {
    title: t('metadata_title'),
  };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations('VerifyEmailPage');
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
        <div className="mx-auto h-16 w-16 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold">ST</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-600 mb-6">
          {t('description')}
        </p>
        <p className="text-sm text-gray-600">
          {t('already_confirmed')}{' '}
          <Link 
            href="/sign-in" 
            className="text-[#7C3AED] hover:text-[#6025DD] font-medium"
          >
            {t('sign_in_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
