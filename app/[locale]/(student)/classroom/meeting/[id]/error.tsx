'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function MeetingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const t = useTranslations('ClassroomMeetingPage');

  // 5秒后自动重定向到课程页面
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard/courses');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-background border rounded-lg shadow-sm p-6 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h2 className="text-lg font-semibold">{t('error_title')}</h2>
        </div>
        
        <p className="text-muted-foreground mb-6">
          {error.message || t('error_default_message')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={reset} variant="outline">
            {t('error_try_again')}
          </Button>
          
          <Button onClick={() => router.push('/dashboard/courses')}>
            {t('error_back_to_courses')}
          </Button>
        </div>
      </div>
    </div>
  );
}