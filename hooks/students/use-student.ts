import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Enrollment } from '@/interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { studentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EnrollmentParams {
  courseId: number;
  studentId: number;
  status: 'active' | 'completed' | 'dropped' | 'locked'; //active','completed','dropped','locked'
}

export function useEnrolledStudent(student_id?: number, course_id?: number) {
  return useQuery<Enrollment[]>({
    queryKey: ['courses', student_id, course_id],
    queryFn: () => {
      // API expects getByCourseOrUserId(courseId, userId) but we have (student_id, course_id)
      // So we pass course_id as courseId and student_id as userId to match the API signature
      const url = studentsApi.getByCourseOrUserId(course_id, student_id);
      return apiGet<Enrollment[]>(url);
    },
    enabled: !!student_id || !!course_id // Allow either student_id OR course_id
  });
}

export function useUpdateStudentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ courseId, studentId, status }: EnrollmentParams) => 
      apiSend<Enrollment>({
        url: studentsApi.updateEnrollmentStatus(studentId, courseId),
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch courses
      queryClient.invalidateQueries({ queryKey: ['courses', variables.studentId, variables.courseId] });
      toast({
        title: 'Success',
        description: `Student status updated to ${variables.status}`,
      });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update student status',
        variant: 'destructive',
      });
    },
  });
}
