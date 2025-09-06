import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api';
import { apiGet, apiSend } from '@/lib/api-config';

// ✅ Fetch module by ID
export function useModuleById(courseId: number, moduleId: number) {
  return useQuery({
    queryKey: ['course-module', courseId, moduleId],
    queryFn: async () =>
      apiGet(coursesApi.getModuleById(courseId, moduleId)), 
    enabled: Boolean(courseId && moduleId),
  });
}

// ✅ Fetch all modules by courseId
export function useModuleByCourseId(courseId: number) {
  return useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () =>
      apiGet(coursesApi.getModuleByCourseId(courseId)), 
    enabled: Boolean(courseId),
  });
}

// ✅ Create module
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      body,
    }: {
      courseId: number;
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'POST',
        url: coursesApi.createModuleByCourseId(courseId),
        body,
      }),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
    },
  });
}

// ✅ Update module
export function useUpdateModule() {
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
        method: 'PUT',
        url: coursesApi.updateModuleById(courseId, moduleId),
        body,
      }),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
    },
  });
}

// ✅ Delete module
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
    }: {
      courseId: number;
      moduleId: number;
    }) =>
      apiSend({
        method: 'DELETE',
        url: coursesApi.deleteModuleById(courseId, moduleId),
      }),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
    },
  });
}
