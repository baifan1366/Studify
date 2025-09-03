import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { Profile } from "@/interface";

/**
 * Hook for fetching user profile.
 * @returns {import('@tanstack/react-query').UseQueryResult<Profile, Error>} Query result with user profile data, loading state, and error.
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile> => {
      const response = await fetch(usersApi.getProfile);
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      const { data } = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook for updating user onboarding data.
 * @returns {import('@tanstack/react-query').UseMutationResult<any, Error, any, unknown>} Mutation result with update function, loading state, and error.
 */
export function useUpdateOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (onboardingData: any) => {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      });
      if (!response.ok) {
        throw new Error('Failed to update onboarding data');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
