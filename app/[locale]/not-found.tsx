'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-24 h-24 md:w-32 md:h-32">
            <Image
              src="/Studify App Logo Design.png"
              alt="Studify Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        {/* Error Code with Animation */}
        <div className="mb-6">
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text animate-pulse">
            404
          </h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t('error_code')}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 dark:border-slate-700/20 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            {t('title')}
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
            {t('subtitle')}
          </p>
          
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-8 leading-relaxed">
            {t('description')}
          </p>

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
        </div>

        {/* Floating Animation Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Floating circles with different delays and sizes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-indigo-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '1s', animationDuration: '4s' }} />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-purple-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '0.5s', animationDuration: '5s' }} />
          <div className="absolute top-1/3 left-1/2 w-20 h-20 bg-cyan-400/10 rounded-full blur-xl animate-pulse" 
               style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
        </div>

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 -z-20 opacity-5">
          <div className="absolute inset-0" 
               style={{
                 backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
                 backgroundSize: '20px 20px'
               }} />
        </div>
      </div>
    </div>
  );
}
