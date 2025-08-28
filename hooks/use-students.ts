import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api';

export interface Student {
  id: number;
  name: string;
  email: string;
  grade: string;
  progress: number;
  enrolledCourses: number;
  lastActive: string;
  avatar?: string;
}

/**
 * Hook for fetching students data
 * @returns Query result with students data, loading state, and error
 */
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async (): Promise<Student[]> => {
      const response = await fetch(studentsApi.list);
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook for fetching a single student by ID
 * @param studentId - The ID of the student to fetch
 * @returns Query result with student data, loading state, and error
 */
export function useStudent(studentId: number) {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: async (): Promise<Student> => {
      const response = await fetch(studentsApi.getById(studentId));
      if (!response.ok) {
        throw new Error(`Failed to fetch student ${studentId}`);
      }
      return response.json();
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // formerly cacheTime
  });
}

/**
 * Hook for searching students
 * @param searchQuery - The search query string
 * @returns Query result with filtered students data
 */
export function useStudentsSearch(searchQuery: string) {
  return useQuery({
    queryKey: ['students', 'search', searchQuery],
    queryFn: async (): Promise<Student[]> => {
      const response = await fetch(studentsApi.search(searchQuery));
      if (!response.ok) {
        throw new Error('Failed to search students');
      }
      return response.json();
    },
    enabled: searchQuery.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 5 * 60 * 1000, // formerly cacheTime
  });
}
