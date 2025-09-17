import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Course } from '@/interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { coursesApi } from '@/lib/api';

// ----------------------
// Queries
// ----------------------

/**
 * 获取所有课程
 */
export function useCourses(owner_id?: number) {
  return useQuery<Course[]>({
    queryKey: ['courses', owner_id],
    queryFn: () => {
      const url = owner_id ? coursesApi.listByOwnerId(owner_id) : coursesApi.list;
      return apiGet<Course[]>(url);
    },
  });
}

/**
 * 获取当前用户的课程
 */
export function useMyCourses() {
  return useQuery<Course[]>({
    queryKey: ['my-courses'],
    queryFn: () => apiGet<Course[]>(coursesApi.list),
  });
}

/**
 * 获取单个课程详情
 */
export function useCourse(id?: number) {
  return useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Course ID is required');
      }
      return apiGet<Course>(coursesApi.getById(id));
    },
    enabled: Boolean(id),
  });
}

/**
 * 获取单个课程详情 (通过 slug)
 */
export function useCourseBySlug(slug?: string) {
  return useQuery<Course>({
    queryKey: ['course-by-slug', slug],
    queryFn: () => {
      if (!slug) {
        throw new Error('Course slug is required');
      }
      return apiGet<Course>(`/api/courses?slug=${slug}`);
    },
    enabled: Boolean(slug),
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
        url: coursesApi.create,
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
    mutationFn: ({ id, ...updates }: { id: number } & Partial<Omit<Course, 'id'>>) =>
      apiSend<Course>({
        url: coursesApi.update(id),
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
    mutationFn: (course: Course) =>
      apiSend<void>({
        url: coursesApi.delete(course.id),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
