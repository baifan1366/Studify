import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api-config';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface PurchaseCourseData {
  courseId: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface PurchaseCourseResponse {
  success: boolean;
  checkoutUrl?: string;
  enrolled?: boolean;
  alreadyEnrolled?: boolean;
  courseSlug?: string;
  message?: string;
  orderId?: string;
}

export function usePurchaseCourse() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('CourseDetailContent');
  const { toast } = useToast();

  return useMutation<PurchaseCourseResponse, Error, PurchaseCourseData>({
    mutationFn: async (data) => {
      // Include locale-aware success URL - ensure proper URL construction
      const baseUrl = window.location.origin;
      const successUrl = data.successUrl || `${baseUrl}/${locale}/courses/{courseSlug}?success=true`;
      const cancelUrl = data.cancelUrl || `${baseUrl}/${locale}/courses/{courseSlug}`;
            
      return apiSend<PurchaseCourseResponse, PurchaseCourseData>({
        url: '/api/course/order',
        method: 'POST',
        body: {
          ...data,
          successUrl,
          cancelUrl
        },
      });
    },
    onSuccess: (data) => {
      // Invalidate course-related queries
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['enrolledCourses'] }); // Fixed: match the actual query key
      queryClient.invalidateQueries({ queryKey: ['enrolledCourse'] }); // Also invalidate individual enrollment checks
      queryClient.invalidateQueries({ queryKey: ['course-by-slug'] });
      
      // Handle already enrolled case
      if (data.alreadyEnrolled && data.courseSlug) {
        toast({
          title: t('already_enrolled'),
          description: t('already_enrolled_desc'),
          variant: 'default',
        });
        
        router.push(`/${locale}/courses/${data.courseSlug}`);
        return;
      }
      
      // If it's a free course and user is enrolled, redirect to course with success
      if (data.enrolled && data.courseSlug) {
        // Show immediate success message for free courses
        toast({
          title: t('enrollment_successful'),
          description: t('enrollment_successful_desc'),
          variant: 'default',
        });
        
        router.push(`/${locale}/courses/${data.courseSlug}?success=true`);
        return;
      }
      
      // For paid courses, redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      console.error('Course purchase failed:', error);
    },
  });
}
