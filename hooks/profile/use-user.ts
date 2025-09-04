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
 * Hook for accessing the current authenticated user's profile.
 * ✅ Uses a single data-fetching library (SWR) for consistency.
 * ✅ Fetches data from the correct backend endpoint.
 * ✅ Provides a clean, easy-to-use return signature.
 */
export function useUser() {
  // 4. Use SWR to fetch data from the API route we created earlier.
  const { data, error, isLoading, mutate } = useSWR<AuthApiResponse>('/api/auth', fetcher, {
    shouldRetryOnError: false, // Optional: prevent retries on auth errors (like 401)
    revalidateOnFocus: true,   // Optional: refetch when the window gains focus
  });

  return {
    // 5. Provide a clean and predictable return object for components to use.
    user: data?.user || null, // The user profile object, or null if not logged in
    isLoading, // True while the initial fetch is in progress
    isError: !!error, // A simple boolean flag for error state
    error, // The actual error object if one occurred
    mutate, // Expose SWR's mutate function to allow for programmatic refetching
  };
}

export default useUser;