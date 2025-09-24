import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for user logout using React Query
 * Handles logout API call and query cache invalidation
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(authApi.logout, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to logout');
      }

      return response.json();
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Logged out successfully',
        description: 'You have been signed out of your account.',
      });

      // Clear all cached queries
      queryClient.clear();
      
      // Clear localStorage data
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      
      // Get current locale for proper redirect
      const locale = pathname.split('/')[1] || 'en';
      
      // Redirect to sign-in page with locale support
      router.push(`/${locale}/sign-in`);
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      
      // Show error toast
      toast({
        title: 'Logout failed',
        description: error.message || 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export default useLogout;
