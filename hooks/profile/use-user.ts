/**
 * User authentication hook using React Query
 * Provides centralized access to user authentication state
 */

import { useQuery } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { apiGet } from '@/lib/api-config';

// Extended User type with profile data
interface ExtendedUser extends User {
  profile?: {
    id: string;
    user_id: string;
    display_name?: string;
    email: string;
    avatar_url?: string;
    role?: string;
    created_at: string;
    updated_at: string;
  };
}

// Response type for the auth API - the API returns the user data directly
type AuthResponse = ExtendedUser | null;

/**
 * Hook for accessing the current authenticated user
 * ✅ Uses apiGet to remove duplicate fetch logic
 * ✅ Uses React Query v5 object-style API
 * 
 * @returns React Query object containing:
 * - data: AuthResponse | undefined - API response data
 *   - user: User | null - Supabase User object with profile data, or null if not authenticated
 *   - error?: string - Optional error message from API
 * - isLoading: boolean - Whether the request is in progress
 * - isError: boolean - Whether an error occurred
 * - error: Error | null - Error object if request failed
 * - isSuccess: boolean - Whether the request succeeded
 * - refetch: () => void - Function to manually refetch user data
 * - isFetching: boolean - Whether a background refetch is happening
 * - isStale: boolean - Whether the data is considered stale
 * 
 * @example
 * ```tsx
 * const { data, isLoading, isError, error } = useUser();
 * 
 * if (isLoading) return <div>Loading...</div>;
 * if (isError) return <div>Error: {error?.message}</div>;
 * if (data?.user) {
 *   // User is authenticated
 *   console.log('User:', data.user);
 *   console.log('Profile:', data.user.profile);
 * } else {
 *   // User is not authenticated
 *   console.log('Not authenticated');
 * }
 * ```
 */
export function useUser() {
  return useQuery<AuthResponse>({
    queryKey: ['user'],
    queryFn: () => apiGet<AuthResponse>('/api/auth/me'),
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter for auth data)
    retry: 1,
    // ✅ Ensure data is fetched on mount
    refetchOnMount: true,
  });
}

export default useUser;