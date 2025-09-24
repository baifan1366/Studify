import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-config';

export interface CourseAutoCreationStatus {
  hasClassroom: boolean;
  hasCommunity: boolean;
  classroomName?: string;
  communityName?: string;
  classroomSlug?: string;
  communitySlug?: string;
}

/**
 * Hook to check if classroom and community exist for a course
 */
export function useCourseAutoCreationStatus(courseName: string, courseSlug: string) {
  return useQuery<CourseAutoCreationStatus>({
    queryKey: ['course-auto-creation-status', courseSlug],
    queryFn: () => apiGet<CourseAutoCreationStatus>(`/api/course/auto-creation-status/${courseSlug}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!courseSlug,
  });
}

/**
 * Helper function to generate expected classroom and community names
 */
export function generateAutoCreationNames(courseName: string) {
  return {
    classroomName: `${courseName} - Classroom`,
    communityName: `${courseName} - Group`,
  };
}
