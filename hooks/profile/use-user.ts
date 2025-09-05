/**
 * User authentication hook using SWR
 * Provides centralized access to the user's profile state.
 */

import useSWR from 'swr';
import { useQuery } from '@tanstack/react-query';
import { Profile } from "@/interface"; 
import { apiGet } from '@/lib/api-config';

// 2. Define the expected response shape from our backend API (/api/auth)
interface AuthApiResponse {
  user: Profile | null;
  servedFromCache?: boolean;
  error?: string;
}

/**
 * Hook for accessing the current authenticated user
 * ✅ Uses apiGet to remove duplicate fetch logic
 * ✅ Uses React Query v5 object-style API
 */
export function useUser() {
  return useQuery<AuthApiResponse>({
    queryKey: ['user'],
    queryFn: () => apiGet<AuthApiResponse>('/api/auth/me'),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
    refetchOnMount: true,
  });
}

export default useUser;