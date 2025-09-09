/**
 * Hook for managing classroom members
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

interface UpdateMemberRoleData {
  role: 'owner' | 'tutor' | 'student';
}

interface RemoveMemberData {
  // No additional data needed - userId comes from URL parameter
}

interface UpdateMemberRoleResponse {
  success: boolean;
  message: string;
  member: {
    user_id: string;
    profile_id: number;
    name: string;
    email: string;
    role: string;
  };
}

interface ClassroomMember {
  user_id: string;
  profile_id: number;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'owner' | 'tutor' | 'student';
  joined_at: string;
  is_current_user: boolean;
}

interface GetMembersResponse {
  success: boolean;
  members: ClassroomMember[];
  current_user_role: string;
}

interface RemoveMemberResponse {
  success: boolean;
  message: string;
}

/**
 * Hook for updating a classroom member's role
 */
export function useUpdateClassroomMember(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<UpdateMemberRoleResponse, Error, UpdateMemberRoleData & { userId: string }>({
    mutationFn: async ({ userId, ...data }) => {
      return apiSend<UpdateMemberRoleResponse, UpdateMemberRoleData>({
        url: `/api/classroom/${classroomSlug}/members/${userId}`,
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate classroom members query
      queryClient.invalidateQueries({ 
        queryKey: ['classroom-members', classroomSlug] 
      });
      // Also invalidate classrooms list in case role changes affect display
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

/**
 * Hook for removing a member from classroom
 */
export function useRemoveClassroomMember(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<RemoveMemberResponse, Error, { userId: string }>({
    mutationFn: async ({ userId }) => {
      return apiSend<RemoveMemberResponse, RemoveMemberData>({
        url: `/api/classroom/${classroomSlug}/members/${userId}`,
        method: 'DELETE',
        body: {},
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate classroom members query
      queryClient.invalidateQueries({ 
        queryKey: ['classroom-members', classroomSlug] 
      });
      // Also invalidate classrooms list
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

/**
 * Hook for fetching classroom members
 */
export function useClassroomMembers(classroomSlug: string | undefined, role?: string) {
  const queryParams = new URLSearchParams();
  
  if (role) {
    queryParams.set('role', role);
  }

  return useQuery<GetMembersResponse>({
    queryKey: ['classroom-members', classroomSlug, role],
    queryFn: () => apiGet<GetMembersResponse>(`/api/classroom/${classroomSlug}/members?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default useUpdateClassroomMember;
