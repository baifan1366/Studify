import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Course } from '@/interface/courses/course-interface';

// API helpers
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return json.data as T;
}

async function apiSend<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: any): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return (json.data ?? json) as T;
}

// Queries
export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiGet<Course[]>('/api/courses'),
  });
}

export function useMyCourses() {
  return useQuery<Course[]>({ // Assumes Course[] is the expected return type
    queryKey: ['my-courses'],
    queryFn: () => apiGet<Course[]>('/api/my-courses'),
  });
}

export function useCourse(id?: string) {
  return useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => apiGet<Course>(`/api/courses/${id}`),
    enabled: Boolean(id),
  });
}

// Mutations
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Course> & { owner_id: number }) =>
      apiSend<Course>('/api/courses', 'POST', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Course>) =>
      apiSend<Course>(`/api/courses/${id}`, 'PATCH', updates),
    onSuccess: (data: Course) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course', data.public_id] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend(`/api/courses/${id}`, 'DELETE'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
