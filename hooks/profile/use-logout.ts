import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';

/**
 * Hook for user logout using React Query
 * Handles logout API call and query cache invalidation
 * Note: Toast messages should be handled in the component using translations
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

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
    // onError callback removed - handle in component with translations
  });
}

export default useLogout;
