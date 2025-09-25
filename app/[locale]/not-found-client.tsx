'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundClient() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NotFoundPage');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace(`/${locale}/home`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, locale]);

  const goHome = () => {
    router.replace(`/${locale}/home`);
  };

  const goBack = () => {
    router.back();
  };

  return (
    <>
      {/* Countdown Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
          <div className="text-sm text-blue-700 dark:text-blue-300 mb-3 font-medium">
            {t('redirecting', { seconds: countdown })}
          </div>
          
          {/* Animated Progress Bar */}
          <div className="w-full bg-blue-200/50 dark:bg-blue-800/30 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000 ease-linear shadow-sm"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
          
          {/* Countdown Circle */}
          <div className="flex justify-center mt-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-700"></div>
              <div 
                className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent transition-transform duration-1000 ease-linear"
                style={{ transform: `rotate(${((5 - countdown) / 5) * 360}deg)` }}
              ></div>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {countdown}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          onClick={goHome}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Home className="w-4 h-4 mr-2" />
          {t('go_home_now')}
        </Button>
        
        <Button 
          variant="outline"
          onClick={goBack}
          className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-2.5 rounded-xl transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('go_back')}
        </Button>
      </div>
    </>
  );
}
