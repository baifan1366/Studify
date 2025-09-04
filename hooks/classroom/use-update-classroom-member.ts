/**
 * Hook for managing classroom members
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

interface UpdateMemberRoleData {
  classroom_id: number;
  user_id: string;
  role: 'owner' | 'tutor' | 'student';
}

interface RemoveMemberData {
  classroom_id: number;
  user_id: string;
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
export function useUpdateClassroomMember() {
  const queryClient = useQueryClient();

  return useMutation<UpdateMemberRoleResponse, Error, UpdateMemberRoleData>({
    mutationFn: async (data) => {
      return apiSend<UpdateMemberRoleResponse, UpdateMemberRoleData>({
        url: '/api/classroom/member',
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate classroom members query
      queryClient.invalidateQueries({ 
        queryKey: ['classroom-members', variables.classroom_id] 
      });
      // Also invalidate classrooms list in case role changes affect display
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

/**
 * Hook for removing a member from classroom
 */
export function useRemoveClassroomMember() {
  const queryClient = useQueryClient();

  return useMutation<RemoveMemberResponse, Error, RemoveMemberData>({
    mutationFn: async (data) => {
      return apiSend<RemoveMemberResponse, RemoveMemberData>({
        url: '/api/classroom/member',
        method: 'DELETE',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate classroom members query
      queryClient.invalidateQueries({ 
        queryKey: ['classroom-members', variables.classroom_id] 
      });
      // Also invalidate classrooms list
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

/**
 * Hook for fetching classroom members
 */
export function useClassroomMembers(classroomId: number) {
  return useQuery<GetMembersResponse>({
    queryKey: ['classroom-members', classroomId],
    queryFn: () => apiGet<GetMembersResponse>(`/api/classroom/member?classroom_id=${classroomId}`),
    enabled: !!classroomId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default useUpdateClassroomMember;
