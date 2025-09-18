import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Enrollment } from '@/interface';
import { Profile } from '@/interface/user/profile-interface';
import { Course } from '@/interface/courses/course-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { studentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface StudentWithProfile extends Enrollment {
  student_profile?: Profile;
  course?: Course;
  progress?: number;
}

interface EnrollmentParams {
  courseId: number;
  studentId: number;
  status: 'active' | 'completed' | 'dropped' | 'locked'; //active','completed','dropped','locked'
}

export function useEnrolledStudentByCourse(course_id: number) {
  return useQuery<Enrollment[]>({
    queryKey: ['courses', course_id],
    queryFn: () => {
      const url = studentsApi.getByCourseId(course_id);
      return apiGet<Enrollment[]>(url);
    },
  });
}

export function useEnrolledCourseByStudent(studentId: number) {
  return useQuery<Enrollment[]>({
    queryKey: ['courses', studentId],
    queryFn: () => {
      const url = studentsApi.getByStudentId(studentId);
      return apiGet<Enrollment[]>(url);
    },
  });
}

interface TutorStudentsResponse {
  tutor_id: number;
  total_courses: number;
  total_students: number;
  courses: Array<{
    id: number;
    title: string;
  }>;
  enrollments: Enrollment[];
}

export function useStudentsByTutorId(tutor_id: number) {
  return useQuery<TutorStudentsResponse>({
    queryKey: ['students', 'tutor', tutor_id],
    queryFn: () => {
      const url = studentsApi.getByTutorId(tutor_id);
      return apiGet<TutorStudentsResponse>(url);
    },
    enabled: !!tutor_id && tutor_id > 0, // Only run query if tutor_id is valid
  });
}

export function useEnrollmentById(studentId: number, courseId: number) {
  return useQuery<StudentWithProfile>({
    queryKey: ['enrollment', courseId, studentId],
    queryFn: () => {
      const url = studentsApi.getEnrollmentById(studentId, courseId);
      return apiGet<StudentWithProfile>(url);
    },
    enabled: !!courseId && !!studentId && courseId > 0 && studentId > 0, // Only run query if both IDs are valid
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
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.courseId, variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['students', 'tutor'] }); // Refresh tutor's students list
      queryClient.invalidateQueries({ queryKey: ['courses'] }); // Refresh course-related queries
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
