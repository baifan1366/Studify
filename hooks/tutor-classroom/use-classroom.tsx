/**
 * Hook for managing classrooms and classroom members
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

/**
 * Hook for fetching all classrooms that the user is a member of
 */
export function useClassrooms() {
  return useQuery<{
    success: boolean;
    classrooms: Array<{
      id: number;
      public_id: string;
      slug: string;
      name: string;
      description: string | null;
      visibility: string;
      class_code: string;
      owner_id: number;
      created_at: string;
      updated_at: string;
      user_role: string;
      joined_at: string;
      member_count: number;
    }>;
  }>({
    queryKey: ['classrooms'],
    queryFn: () => apiGet('/api/tutor-classroom'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

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
        url: `/api/tutor-classroom/${classroomSlug}/members/${userId}`,
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
        url: `/api/tutor-classroom/${classroomSlug}/members/${userId}`,
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
    queryFn: () => apiGet<GetMembersResponse>(`/api/tutor-classroom/${classroomSlug}/members?${queryParams}`),
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface ClassroomDetails {
  id: number;
  public_id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
  classroom_member: Array<{
    id: number;
    role: string;
    joined_at: string;
    profiles: {
      display_name: string;
      avatar_url: string | null;
    };
  }>;
  userMembership: {
    id: number;
    role: string;
  };
}

interface GetClassroomResponse {
  success?: boolean;
  classroom?: ClassroomDetails;
}

interface UpdateClassroomData {
  name: string;
  description?: string;
}

interface UpdateClassroomResponse {
  success: boolean;
  classroom: ClassroomDetails;
}

interface DeleteClassroomResponse {
  success: boolean;
  message: string;
}

/**
 * Hook for fetching classroom details by slug
 */
export function useClassroomDetails(classroomSlug: string | undefined) {
  return useQuery<ClassroomDetails>({
    queryKey: ['classroom-details', classroomSlug],
    queryFn: () => apiGet<ClassroomDetails>(`/api/tutor-classroom/${classroomSlug}`),
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for updating classroom details
 */
export function useUpdateClassroom(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<UpdateClassroomResponse, Error, UpdateClassroomData>({
    mutationFn: async (data) => {
      return apiSend<UpdateClassroomResponse, UpdateClassroomData>({
        url: `/api/tutor-classroom/${classroomSlug}`,
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['classroom-details', classroomSlug] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

/**
 * Hook for deleting classroom
 */
export function useDeleteClassroom(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<DeleteClassroomResponse, Error, void>({
    mutationFn: async () => {
      return apiSend<DeleteClassroomResponse, {}>({
        url: `/api/tutor-classroom/${classroomSlug}`,
        method: 'DELETE',
        body: {},
      });
    },
    onSuccess: () => {
      // Invalidate classrooms list since the classroom is deleted
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['classroom-details', classroomSlug] });
    },
  });
}
