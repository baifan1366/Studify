import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { Profile } from "@/interface";
import { apiGet, apiSend } from '@/lib/api-config';

/**
 * Hook for fetching user profile.
 * ✅ Uses apiGet to simplify fetch & error handling
 */
export function useUserProfile() {
  return useQuery<Profile>({
    queryKey: ["profiles"],
    queryFn: () => apiGet<Profile>(usersApi.getProfile),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook for updating user onboarding data.
 * ✅ Uses apiSend to avoid repeating fetch + JSON + error logic
 */
export function useUpdateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Record<string, any>>({
    mutationFn: (onboardingData) =>
      apiSend({
        url: '/api/onboarding',
        method: 'POST',
        body: onboardingData,
      }),
    onSuccess: () => {
      // ✅ Refresh the profile query after successful update
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
