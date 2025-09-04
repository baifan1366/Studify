import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

/**
 * Hook for user logout using React Query
 * Handles logout API call and query cache invalidation
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
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
      // Redirect to login page
      router.push('/auth/login');
    },
    onError: (error) => {
      console.error('Logout failed:', error);
    },
  });
}

export default useLogout;
