import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Course } from '@/interface';
import { apiSend } from '@/lib/api-config';
import { coursesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UpdateStatusParams {
  courseId: number;
  status: 'active' | 'pending' | 'inactive' | 'ban' | 'rejected';
}

export function useUpdateCourseStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ courseId, status }: UpdateStatusParams) => 
      apiSend<Course>({
        url: coursesApi.updateStatus(courseId),
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch courses
      queryClient.invalidateQueries({ queryKey: ['courses', variables.courseId] });
      toast({
        title: 'Success',
        description: `Course status updated to ${variables.status}`,
      });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update course status',
        variant: 'destructive',
      });
    },
  });
}
