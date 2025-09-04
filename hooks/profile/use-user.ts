/**
 * User authentication hook using SWR
 * Provides centralized access to the user's profile state.
 */

import useSWR from 'swr';
// 1. Corrected the import to use the actual interface name: 'Profile'
import type { Profile } from "@/interface/user/profile-interface"; 

// 2. Define the expected response shape from our backend API (/api/auth)
interface AuthApiResponse {
  user: Profile | null;
  servedFromCache?: boolean;
  error?: string;
}

// 3. The fetcher function is simplified. It uses apiGet as per your project rules.
//    This relies on the browser's automatic handling of httpOnly cookies for auth.
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
});

/**
 * Hook for accessing the current authenticated user
 * ✅ Uses apiGet to remove duplicate fetch logic
 * ✅ Uses React Query v5 object-style API
 */
export function useUser() {
  return useQuery<AuthResponse>({
    queryKey: ['user'],
    queryFn: () => apiGet<AuthResponse>('/api/auth/me'),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
    refetchOnMount: true,
  });
}

export default useUser;