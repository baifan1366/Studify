/**
 * Hook for managing live sessions
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiSend, apiGet } from '@/lib/api-config';

interface CreateLiveSessionData {
  classroomSlug: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
}

interface UpdateLiveSessionData {
  classroomSlug: string;
  session_id: number;
  status?: 'scheduled' | 'live' | 'ended' | 'cancelled';
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
}

interface LiveSession {
  id: number;
  public_id: string;
  classroom_id: number;
  title: string;
  description?: string;
  slug: string;
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
      const { classroomSlug, ...bodyData } = data;
      return apiSend<CreateLiveSessionResponse, Omit<CreateLiveSessionData, 'classroomSlug'>>({
        url: `/api/classroom/${classroomSlug}/live-sessions`,
        method: 'POST',
        body: bodyData,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate live sessions query for this classroom
      queryClient.invalidateQueries({ 
        queryKey: ['live-sessions', variables.classroomSlug] 
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
      const { classroomSlug, ...bodyData } = data;
      return apiSend<UpdateLiveSessionResponse, Omit<UpdateLiveSessionData, 'classroomSlug'>>({
        url: `/api/classroom/${classroomSlug}/live-sessions`,
        method: 'PATCH',
        body: bodyData,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate live sessions queries
      queryClient.invalidateQueries({ 
        queryKey: ['live-sessions', variables.classroomSlug] 
      });
    },
  });
}

/**
 * Hook for fetching live sessions for a classroom
 */
export function useLiveSessions(classroomSlug: string | undefined, status?: string) {
  const queryParams = new URLSearchParams();
  
  if (status) {
    queryParams.set('status', status);
  }

  const queryString = queryParams.toString();
  const url = classroomSlug 
    ? `/api/classroom/${classroomSlug}/live-sessions${queryString ? `?${queryString}` : ''}`
    : '';

  return useQuery<GetLiveSessionsResponse>({
    queryKey: ['live-sessions', classroomSlug, status],
    queryFn: () => apiGet<GetLiveSessionsResponse>(url),
    enabled: !!classroomSlug,
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
      color: string | null;
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