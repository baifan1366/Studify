import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api';
import { apiGet, apiSend } from '@/lib/api-config';

// ✅ Fetch lesson by ID
export function useLessonById(courseId: string, moduleId: string, lessonId: string) {
  return useQuery({
    queryKey: ['course-lesson', courseId, moduleId, lessonId],
    queryFn: async () =>
      apiGet(coursesApi.getLessonById(courseId, moduleId, lessonId)),
    enabled: Boolean(courseId && moduleId && lessonId),
  });
}

// ✅ Fetch all lessons in a module
export function useLessonByCourseModuleId(courseId: string, moduleId: string) {
  return useQuery({
    queryKey: ['course-lessons', courseId, moduleId],
    queryFn: async () =>
      apiGet(coursesApi.getLessonByCourseModuleId(courseId, moduleId)), 
    enabled: Boolean(courseId && moduleId),
  });
}

// ✅ Create lesson
export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      body,
    }: {
      courseId: string;
      moduleId: string;
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'POST',
        url: coursesApi.createLessonByCourseModuleId(courseId, moduleId),
        body,
      }),
    onSuccess: (_, { courseId, moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId, moduleId] });
    },
  });
}

// ✅ Update lesson
export function useUpdateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      lessonId,
      body,
    }: {
      courseId: string;
      moduleId: string;
      lessonId: string;
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'PUT',
        url: coursesApi.updateLessonById(courseId, moduleId, lessonId),
        body,
      }),
    onSuccess: (_, { courseId, moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId, moduleId] });
    },
  });
}

// ✅ Delete lesson
export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      lessonId,
    }: {
      courseId: string;
      moduleId: string;
      lessonId: string;
    }) =>
      apiSend({
        method: 'DELETE',
        url: coursesApi.deleteLessonById(courseId, moduleId, lessonId),
      }),
    onSuccess: (_, { courseId, moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId, moduleId] });
    },
  });
}
