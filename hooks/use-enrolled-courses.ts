import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// 已注册课程类型定义
export interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorAvatar?: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  nextLesson: string;
  dueDate: string;
  status: string;
  color: string;
  lastAccessed: string;
  tags: string[];
  role: string;
}

// 课程搜索结果类型定义
export interface CourseSearchResult {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorAvatar?: string;
  totalLessons: number;
  studentCount: number;
  rating: number;
  price: number;
  currency: string;
  isFree: boolean;
  color: string;
  tags: string[];
  duration: string;
}

// 推荐课程类型定义
export interface RecommendedCourse extends CourseSearchResult {
  recommendReason: string;
}

// 获取已注册课程
async function fetchEnrolledCourses(): Promise<EnrolledCourse[]> {
  const response = await fetch(classroomApi.enrolledCourses);

  // Check if the response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Invalid response format:', await response.text());
    throw new Error('Invalid response format: Expected JSON');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch enrolled courses');
  }

  return response.json();
}

// 搜索课程
async function searchCourses(query: string): Promise<CourseSearchResult[]> {
  const response = await fetch(classroomApi.search(query));
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search courses');
  }
  return response.json();
}

// 获取推荐课程
async function fetchRecommendedCourses(): Promise<RecommendedCourse[]> {
  const response = await fetch(classroomApi.recommend);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch recommended courses');
  }
  return response.json();
}

// 加入课程
async function joinCourse(courseId: string, inviteCode?: string): Promise<any> {
  const response = await fetch(classroomApi.join, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId, inviteCode }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to join course');
  }
  return data;
}

// 已注册课程Hook
export function useEnrolledCourses() {
  return useQuery<EnrolledCourse[], Error>({
    queryKey: ['enrolledCourses'],
    queryFn: fetchEnrolledCourses,
  });
}

// 搜索课程Hook
export function useSearchCourses(query: string) {
  return useQuery<CourseSearchResult[], Error>({
    queryKey: ['searchCourses', query],
    queryFn: () => searchCourses(query),
    enabled: !!query, // 只有当有查询字符串时才执行
  });
}

// 推荐课程Hook
export function useRecommendedCourses() {
  return useQuery<RecommendedCourse[], Error>({
    queryKey: ['recommendedCourses'],
    queryFn: fetchRecommendedCourses,
  });
}

// 加入课程Hook
export function useJoinCourse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<any, Error, { courseId: string; inviteCode?: string }>({
    mutationFn: ({ courseId, inviteCode }) => joinCourse(courseId, inviteCode),
    onSuccess: (data) => {
      // 成功后刷新已注册课程列表
      queryClient.invalidateQueries({ queryKey: ['enrolledCourses'] });
      toast({
        title: 'Success',
        description: data.message || 'Successfully joined the course',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
