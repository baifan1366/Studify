import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api';
import { Profile } from '@/interface';
import { apiGet } from '@/lib/api-config';

/**
 * Hook for fetching all students
 * ✅ Uses apiGet to remove duplicate fetch logic
 */
export function useStudents() {
  return useQuery<Profile[]>({
    queryKey: ['students'],
    queryFn: () => apiGet<Profile[]>(studentsApi.list),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook for fetching a single student by ID
 * @param studentId - The ID of the student to fetch
 */
export function useStudent(studentId: number) {
  return useQuery<Profile>({
    queryKey: ['student', studentId],
    queryFn: () => apiGet<Profile>(studentsApi.getById(studentId)),
    enabled: !!studentId,     // ✅ Only run query if studentId is valid
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for searching students
 * @param searchQuery - The search query string
 */
export function useStudentsSearch(searchQuery: string) {
  return useQuery<Profile[]>({
    queryKey: ['students', 'search', searchQuery],
    queryFn: () => apiGet<Profile[]>(studentsApi.search(searchQuery)),
    enabled: searchQuery.length > 0, // ✅ Only run when there's input
    staleTime: 2 * 60 * 1000, // Cache search results for 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}
