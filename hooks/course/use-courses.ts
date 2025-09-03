import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Course } from '@/interface';
import { apiGet, apiSend } from '@/lib/api-config';

// ----------------------
// Queries
// ----------------------

/**
 * 获取所有课程
 */
export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiGet<Course[]>('/api/courses'),
  });
}

/**
 * 获取当前用户的课程
 */
export function useMyCourses() {
  return useQuery<Course[]>({
    queryKey: ['my-courses'],
    queryFn: () => apiGet<Course[]>('/api/my-courses'),
  });
}

/**
 * 获取单个课程详情
 */
export function useCourse(id?: string) {
  return useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => apiGet<Course>(`/api/courses/${id}`),
    enabled: Boolean(id),
  });
}

// ----------------------
// Mutations
// ----------------------

/**
 * 创建课程
 */
export function useCreateCourse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Course> & { owner_id: number }) =>
      apiSend<Course>({
        url: '/api/courses',
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * 更新课程
 */
export function useUpdateCourse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Course>) =>
      apiSend<Course>({
        url: `/api/courses/${id}`,
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: Course) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course', data.public_id] });
    },
  });
}

/**
 * 删除课程
 */
export function useDeleteCourse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiSend<void>({
        url: `/api/courses/${id}`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
