/**
 * Hook for creating classrooms
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api-config';

interface CreateClassroomData {
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
}

interface CreateClassroomResponse {
  success: boolean;
  classroom: {
    id: number;
    public_id: string;
    slug: string;
    name: string;
    description: string | null;
    class_code: string;
    visibility: string;
    owner_id: number;
    created_at: string;
    updated_at: string;
    member_count: number;
    user_role: string;
  };
}

/**
 * Hook for creating a new classroom
 */
export function useCreateClassroom() {
  const queryClient = useQueryClient();

  return useMutation<CreateClassroomResponse, Error, CreateClassroomData>({
    mutationFn: async (data) => {
      try {
        const response = await apiSend<CreateClassroomResponse, CreateClassroomData>({
          url: '/api/classroom',
          method: 'POST',
          body: data,
        });
        return response;
      } catch (error: any) {
        // Parse error response to provide better error messages
        if (error.message) {
          try {
            const errorData = JSON.parse(error.message);
            if (errorData.error) {
              throw new Error(errorData.error);
            }
          } catch (parseError) {
            // If parsing fails, use the original error message
            throw new Error(error.message);
          }
        }
        throw new Error('Failed to create classroom. Please try again.');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch classrooms list
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

export default useCreateClassroom;