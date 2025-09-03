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
    <div className="h-screen w-screen flex items-center justify-center p-6 bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-200">
      <div className="bg-white/80 dark:bg-[#0D1F1A] rounded-2xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:border dark:border-gray-700/50 p-8 backdrop-blur-sm transition-colors duration-300 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
          <img 
            src="/favicon.png" 
            alt="Studify Logo" 
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[#222] dark:text-[#F1F5F9]">{t('title')}</h1>
        <p className="text-[#555] dark:text-[#E5E7EB] mb-6">
          {t('description')}
        </p>
        <p className="text-sm text-[#555] dark:text-[#E5E7EB]">
          {t('already_confirmed')}{' '}
          <Link 
            href="/sign-in" 
            className="text-[#FF6B00] hover:text-[#E05E00] font-medium transition-colors"
          >
            {t('sign_in_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
