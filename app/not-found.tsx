'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const [isClient, setIsClient] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isStudent, setIsStudent] = useState(true)
  
  //check pathname include /tutor/ or not
  const pathname = usePathname();
  const isTutor = pathname.includes('/tutor/');
  
  // Always call hooks - this is required by Rules of Hooks
  const router = useRouter();
  const t = useTranslations('NotFoundPage');
  
  // Ensure we're on the client side before using router functionality
  useEffect(() => {
    setIsClient(true);
    setIsStudent(!isTutor);
  }, [isTutor]);

  useEffect(() => {
    if (!isClient) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace(isStudent ? '/home' : '/tutor/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, isClient, isStudent]);

  const goHome = () => {
    if (isClient) {
      router.replace(isStudent ? '/home' : '/tutor/dashboard');
    }
  };

  const goBack = () => {
    if (isClient) {
      router.back();
    }
  };

  // Provide fallback content during SSR/prerendering
  if (!isClient) {
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
          
          {/* Error Code */}
          <div className="mb-6">
            <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
              404
            </h1>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Error 404
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 dark:border-slate-700/20">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Page Not Found
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              Oops! The page you're looking for doesn't exist
            </p>
            
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
              The link you followed may be broken, or the page may have been removed.
            </p>

            <div className="text-sm text-blue-700 dark:text-blue-300 mb-8">
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        
        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
            404
          </h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {t('error_code')}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 dark:border-slate-700/20">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            {t('title')}
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            {t('subtitle')}
          </p>
          
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
            {t('description')}
          </p>

          {/* Countdown */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
              <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                {t('redirecting', { seconds: countdown })}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200/50 dark:bg-blue-800/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={goHome}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('go_home_now')}
            </Button>
            
            <Button 
              variant="outline"
              onClick={goBack}
              className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-2.5 rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('go_back')}
            </Button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-indigo-400/10 rounded-full blur-xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-purple-400/10 rounded-full blur-xl animate-pulse delay-500" />
        </div>
      </div>
    </div>
  );
}
