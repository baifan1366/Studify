/**
 * Hook for joining classrooms via class code
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api-config';

interface JoinClassroomData {
  class_code: string;
  password?: string;
}

interface JoinClassroomResponse {
  success: boolean;
  message: string;
  classroom: {
    id: number;
    public_id: string;
    slug: string;
    name: string;
    description: string | null;
    visibility: string;
    owner_id: number;
    created_at: string;
    updated_at: string;
    user_role: string;
    joined_at: string;
    member_count: number;
  };
}

/**
 * Hook for joining a classroom using class code
 */
export function useJoinClassroom() {
  const queryClient = useQueryClient();

  return useMutation<JoinClassroomResponse, Error, JoinClassroomData>({
    mutationFn: async (data) => {
      return apiSend<JoinClassroomResponse, JoinClassroomData>({
        url: '/api/classroom/join',
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch classrooms list
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

export default useJoinClassroom;
