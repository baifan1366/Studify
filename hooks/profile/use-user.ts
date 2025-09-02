/**
 * User authentication hook using React Query
 * Provides centralized access to user authentication state
 */

import { useQuery } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { apiGet } from '@/lib/api-config';

// Response type for the auth API
interface AuthResponse {
  user: User | null;
  error?: string;
}

/**
 * Hook for accessing the current authenticated user
 * ✅ Uses apiGet to remove duplicate fetch logic
 * ✅ Uses React Query v5 object-style API
 */
export function useUser() {
  return useQuery<AuthResponse>({
    queryKey: ['user'],
    queryFn: () => apiGet<AuthResponse>('/api/auth/me'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export default useUser;
