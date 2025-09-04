/**
 * Hook for managing live sessions
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

interface CreateLiveSessionData {
  classroom_id: number;
  title: string;
  starts_at: string;
  ends_at?: string;
}

interface UpdateLiveSessionData {
  session_id: number;
  status?: 'scheduled' | 'live' | 'ended' | 'cancelled';
  title?: string;
  starts_at?: string;
  ends_at?: string;
}

interface LiveSession {
  id: number;
  public_id: string;
  classroom_id: number;
  title: string;
  host_id: number;
  starts_at: string;
  ends_at: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_at: string;
  updated_at: string;
  host_name: string;
  host_email: string;
  is_host: boolean;
  can_manage: boolean;
}

interface CreateLiveSessionResponse {
  success: boolean;
  message: string;
  session: LiveSession & {
    classroom_name: string;
  };
}

interface GetLiveSessionsResponse {
  success: boolean;
  sessions: LiveSession[];
  current_user_role: string;
}

interface UpdateLiveSessionResponse {
  success: boolean;
  message: string;
  session: Omit<LiveSession, 'host_name' | 'host_email' | 'is_host' | 'can_manage'>;
}

/**
 * Hook for creating a live session
 */
export function useCreateLiveSession() {
  const queryClient = useQueryClient();

  return useMutation<CreateLiveSessionResponse, Error, CreateLiveSessionData>({
    mutationFn: async (data) => {
      return apiSend<CreateLiveSessionResponse, CreateLiveSessionData>({
        url: '/api/classroom/live-session',
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate live sessions query for this classroom
      queryClient.invalidateQueries({ 
        queryKey: ['live-sessions', variables.classroom_id] 
      });
    },
  });
}

/**
 * Hook for updating a live session
 */
export function useUpdateLiveSession() {
  const queryClient = useQueryClient();

  return useMutation<UpdateLiveSessionResponse, Error, UpdateLiveSessionData>({
    mutationFn: async (data) => {
      return apiSend<UpdateLiveSessionResponse, UpdateLiveSessionData>({
        url: '/api/classroom/live-session',
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate live sessions queries
      queryClient.invalidateQueries({ 
        queryKey: ['live-sessions'] 
      });
    },
  });
}

/**
 * Hook for fetching live sessions for a classroom
 */
export function useLiveSessions(classroomId: number, status?: string) {
  const queryParams = new URLSearchParams({
    classroom_id: classroomId.toString(),
    ...(status && { status }),
  });

  return useQuery<GetLiveSessionsResponse>({
    queryKey: ['live-sessions', classroomId, status],
    queryFn: () => apiGet<GetLiveSessionsResponse>(`/api/classroom/live-session?${queryParams}`),
    enabled: !!classroomId,
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter for live data)
  });
}

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
    queryFn: () => apiGet('/api/classroom'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default useCreateLiveSession;
