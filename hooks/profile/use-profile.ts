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
 * Hook for fetching full profile data with all settings
 */
export function useFullProfile(profileId: string) {
  return useQuery<any>({
    queryKey: ["profile", "full", profileId],
    queryFn: () => apiGet<any>(`/api/profile/${profileId}`),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    enabled: !!profileId,
  });
}
/**
 * Hook for updating user profile information
 */
export function useUpdateProfile(profileId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Record<string, any>>({
    mutationFn: (profileData) =>
      apiSend({
        url: `/api/profile/${profileId}`,
        method: 'PATCH',
        body: profileData,
      }),
    onSuccess: () => {
      // Refresh both profile queries after successful update
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'full'] });
    },
  });
}

/**
 * Hook for updating user settings/preferences
 */
export function useUpdateSettings(profileId: string) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Record<string, any>>({
    mutationFn: (settingsData) =>
      apiSend({
        url: `/api/profile/${profileId}`,
        method: 'PATCH',
        body: settingsData,
      }),
    onSuccess: () => {
      // Refresh profile queries after successful settings update
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'full', profileId] });
    },
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
