import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api';
import { apiGet, apiSend } from '@/lib/api-config';
import { Lesson } from '@/interface/courses/lesson-interface';

// ✅ Fetch lesson by ID
export function useLessonById(courseId: number, moduleId: number, lessonId: number) {
  return useQuery({
    queryKey: ['course-lesson', courseId, moduleId, lessonId],
    queryFn: async () =>
      apiGet(coursesApi.getLessonById(courseId, moduleId, lessonId)),
    enabled: Boolean(courseId && moduleId && lessonId),
  });
}

// ✅ Fetch all lessons in a module
export function useLessonByCourseModuleId(courseId: number, moduleId: number) {
  return useQuery<Lesson[]>({
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
      courseId: number;
      moduleId: number;
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
      courseId: number;
      moduleId: number;
      lessonId: number;
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'PATCH',
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
      courseId: number;
      moduleId: number;
      lessonId: number;
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

// ✅ Fetch all lessons across all modules for a course
export function useAllLessonsByCourseId(courseId: number, modules: any[]) {
  return useQuery({
    queryKey: ['all-course-lessons', courseId, modules?.map(m => m.id).sort()],
    queryFn: async () => {
      if (!modules || modules.length === 0) {
        return [];
      }

      const allModuleLessons: any[] = [];
      
      // Fetch lessons for each module
      for (const module of modules) {
        try {
          const lessons = await apiGet(coursesApi.getLessonByCourseModuleId(courseId, module.id)) as Lesson[];
          
          lessons.forEach((lesson: any, lessonIndex: number) => {
            allModuleLessons.push({
              ...lesson,
              moduleTitle: module.title,
              moduleId: module.id,
              modulePosition: lessonIndex + 1
            });
          });
        } catch (error) {
          console.error(`Error fetching lessons for module ${module.id}:`, error);
        }
      }
      
      // Sort by module position first, then by lesson position within module
      return allModuleLessons.sort((a, b) => {
        const moduleA = modules.findIndex(m => m.id === a.moduleId);
        const moduleB = modules.findIndex(m => m.id === b.moduleId);
        
        if (moduleA !== moduleB) {
          return moduleA - moduleB;
        }
        return (a.position || 0) - (b.position || 0);
      });
    },
    enabled: Boolean(courseId && modules && modules.length > 0),
  });
}
