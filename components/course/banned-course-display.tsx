'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Clock, ArrowLeft, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFormat } from '@/hooks/use-format';
import { useRouter } from 'next/navigation';
import { useBanByTarget } from '@/hooks/ban/use-ban';
import { useCourse } from '@/hooks/course/use-courses';

interface BannedCourseDisplayProps {
  courseId: number;
  courseName?: string;
}

export default function BannedCourseDisplay({ courseId, courseName }: BannedCourseDisplayProps) {
  const t = useTranslations('BannedCourseDisplay');
  const { formatDate, formatRelativeTime } = useFormat();
  const router = useRouter();
  
  // Fetch course data
  const { data: course } = useCourse(courseId);
  
  // Fetch ban information
  const { data: banInfo, isLoading } = useBanByTarget('course', courseId);
  const activeBan = banInfo && banInfo.length > 0 ? banInfo[0] : null;

  const displayCourseName = courseName || course?.title || `Course #${courseId}`;
  const isTemporary = activeBan?.expires_at && new Date(activeBan.expires_at) > new Date();
  const isPermanent = !activeBan?.expires_at;

  const handleGoBack = () => {
    router.back();
  };

  const handleGoToCourses = () => {
    router.push('/courses');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Main Ban Alert */}
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
          <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          <AlertDescription>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-200 font-semibold text-lg">
                  {t('courseBannedTitle')}
                </span>
              </div>
              
              <div className="text-red-700 dark:text-red-300">
                <p className="mb-2">{t('accessRestricted')}</p>
                <p className="text-sm">{t('contactSupport')}</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Course Information Card */}
        <Card className="bg-white dark:bg-gray-800 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {displayCourseName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Ban Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                {t('bannedStatus')}
              </Badge>
              {isTemporary && (
                <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                  {t('temporaryBan')}
                </Badge>
              )}
              {isPermanent && (
                <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
                  {t('permanentBan')}
                </Badge>
              )}
            </div>

            {/* Ban Details */}
            {activeBan && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t('banReason')}
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {activeBan.reason}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-medium">{t('bannedOn')}: </span>
                    {formatDate(activeBan.created_at, { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  
                  {activeBan.expires_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{t('expiresAt')}: </span>
                      {formatDate(activeBan.expires_at, { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>

                {isTemporary && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-orange-800 dark:text-orange-200 text-sm">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {t('temporaryBanMessage', {
                        time: formatRelativeTime(activeBan.expires_at!)
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Information Message */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                {t('whatCanYouDo')}
              </h4>
              <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                <li>• {t('enrollOtherCourses')}</li>
                <li>• {t('contactSupportDetails')}</li>
                <li>• {t('checkAnnouncements')}</li>
                {isTemporary && <li>• {t('waitForExpiry')}</li>}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('goBack')}
              </Button>
              
              <Button
                onClick={handleGoToCourses}
                className="flex items-center gap-2"
              >
                {t('browseCourses')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Information */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('footerMessage')}</p>
        </div>
      </div>
    </div>
  );
}
