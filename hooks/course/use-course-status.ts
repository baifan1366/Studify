import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Course } from '@/interface';
import { apiSend } from '@/lib/api-config';
import { coursesApi } from '@/lib/api';

interface UpdateStatusParams {
  courseId: string;
  status: 'active' | 'pending' | 'inactive';
}

export function useUpdateCourseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, status }: UpdateStatusParams) => 
      apiSend<Course>({
        url: coursesApi.updateStatus(courseId),
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch courses
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: Error) => {
      console.error(error);
    },
  });
}
