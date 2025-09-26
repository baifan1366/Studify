import { useQuery } from '@tanstack/react-query';
import { ProfileData } from '@/interface/profile-interface';

// Hook to fetch user profile by user ID
export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<ProfileData> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`/api/profiles/${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Profile not found');
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if profile not found
      if (error.message === 'Profile not found') {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// Hook to fetch multiple profiles by user IDs
export function useProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ['profiles', userIds.sort()],
    queryFn: async (): Promise<ProfileData[]> => {
      if (userIds.length === 0) {
        return [];
      }

      // Fetch all profiles in parallel
      const promises = userIds.map(async (userId) => {
        try {
          const response = await fetch(`/api/profiles/${userId}`);
          if (!response.ok) {
            console.warn(`Failed to fetch profile for user ${userId}`);
            return null;
          }
          return await response.json();
        } catch (error) {
          console.warn(`Error fetching profile for user ${userId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((profile): profile is ProfileData => profile !== null);
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
