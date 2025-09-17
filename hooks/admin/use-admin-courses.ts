// hooks/admin/use-admin-courses.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import type {
  AdminCoursesResponse,
  AdminCourseDetails,
  AdminCourseFilters,
  AdminCourseAnalytics
} from '@/interface/admin/admin-interface';

// Fetch courses with filters and pagination
export function useAdminCourses(filters: AdminCourseFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'courses', filters],
    queryFn: async (): Promise<AdminCoursesResponse> => {
      return adminApi.getCourses(filters);
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Fetch single course details
export function useAdminCourse(courseId: string) {
  return useQuery({
    queryKey: ['admin', 'courses', courseId],
    queryFn: async (): Promise<AdminCourseDetails> => {
      const data = await adminApi.getCourse(courseId);
      return data.course;
    },
    enabled: !!courseId,
    staleTime: 60000, // 1 minute
  });
}

// Update course
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, updates }: {
      courseId: string;
      updates: any;
    }) => {
      return adminApi.updateCourse(courseId, updates);
    },
    onSuccess: (data, variables) => {
      toast.success('Course updated successfully');
      
      // Invalidate and refetch courses queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', variables.courseId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update course');
    },
  });
}

// Delete course
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      return adminApi.deleteCourse(courseId);
    },
    onSuccess: () => {
      toast.success('Course deleted successfully');
      
      // Invalidate and refetch courses queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete course');
    },
  });
}

// Approve course
export function useApproveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, notes }: {
      courseId: string;
      notes?: string;
    }) => {
      return adminApi.approveCourse(courseId, notes);
    },
    onSuccess: (data, variables) => {
      toast.success('Course approved successfully');
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve course');
    },
  });
}

// Reject course
export function useRejectCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, reason }: {
      courseId: string;
      reason: string;
    }) => {
      return adminApi.rejectCourse(courseId, reason);
    },
    onSuccess: (data, variables) => {
      toast.success('Course rejected successfully');
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject course');
    },
  });
}

// Get course analytics
export function useAdminCourseAnalytics(period: number = 30) {
  return useQuery({
    queryKey: ['admin', 'courses', 'analytics', period],
    queryFn: async (): Promise<AdminCourseAnalytics> => {
      return adminApi.getCourseAnalytics(period);
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });
}

// Get course statistics
export function useCourseStats() {
  return useQuery({
    queryKey: ['admin', 'courses', 'stats'],
    queryFn: async () => {
      const data = await adminApi.getCourses({ limit: 1 });
      
      // Get counts for different statuses
      const [activeCourses, pendingCourses, inactiveCourses] = await Promise.all([
        adminApi.getCourses({ status: 'active', limit: 1 }),
        adminApi.getCourses({ status: 'pending', limit: 1 }),
        adminApi.getCourses({ status: 'inactive', limit: 1 }),
      ]);

      return {
        total: data.pagination.total,
        active: activeCourses.pagination.total,
        pending: pendingCourses.pagination.total,
        inactive: inactiveCourses.pagination.total,
      };
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
}
