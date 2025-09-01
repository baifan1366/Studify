/**
 * User authentication hook using React Query
 * Provides centralized access to user authentication state
 */

import { useQuery } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';

// Response type for the auth API
interface AuthResponse {
  user: User | null;
  error?: string;
}

/**
 * Hook for accessing the current authenticated user
 * Uses React Query for caching and state management
 */
export function useUser() {
  return useQuery<AuthResponse>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/auth');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }
      
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export default useUser;