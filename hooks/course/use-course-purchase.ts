import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api-config';

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

  return useMutation<PurchaseCourseResponse, Error, PurchaseCourseData>({
    mutationFn: async (data) => {
      return apiSend<PurchaseCourseResponse, PurchaseCourseData>({
        url: '/api/course/order',
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data) => {
      // Invalidate course-related queries
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] });
      
      // If it's a free course and user is enrolled, redirect to course
      if (data.enrolled) {
        // Handle immediate enrollment for free courses
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
