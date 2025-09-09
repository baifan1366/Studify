"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classroomApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { apiSend, apiGet } from "@/lib/api-config";

// =====================
// Type Definitions
// =====================

// 已注册课程类型
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

// 搜索课程类型
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

// 推荐课程类型
export interface RecommendedCourse extends CourseSearchResult {
  recommendReason: string;
}

// =====================
// API Functions
// =====================

// 获取已注册课程
const fetchEnrolledCourses = () =>
  apiGet<EnrolledCourse[]>(classroomApi.enrolledCourses);

// 搜索课程
const searchCourses = (query: string, category?: string) =>
  apiGet<CourseSearchResult[]>(`/api/courses/search?q=${encodeURIComponent(query)}${category ? `&category=${encodeURIComponent(category)}` : ''}`);

// 获取推荐课程
const fetchRecommendedCourses = () =>
  apiGet<RecommendedCourse[]>('/api/courses/recommendations');

// 加入课程
const joinCourse = (courseId: string, inviteCode?: string) =>
  apiSend<{ message: string }>({
    url: classroomApi.join,
    method: "POST",
    body: { courseId, inviteCode },
  });

// =====================
// React Query Hooks
// =====================

// 已注册课程 Hook
export function useEnrolledCourses() {
  return useQuery<EnrolledCourse[], Error>({
    queryKey: ["enrolledCourses"],
    queryFn: fetchEnrolledCourses,
    staleTime: 1000 * 60 * 3, // 缓存 3 分钟
    refetchOnWindowFocus: false,
  });
}

// 搜索课程 Hook
export function useSearchCourses(query: string, category?: string) {
  return useQuery<CourseSearchResult[], Error>({
    queryKey: ["searchCourses", query, category],
    queryFn: () => searchCourses(query, category),
    enabled: !!query, // 只有有关键词时才搜索
    staleTime: 1000 * 60 * 1, // 缓存 1 分钟
  });
}

// 推荐课程 Hook
export function useRecommendedCourses() {
  return useQuery<RecommendedCourse[], Error>({
    queryKey: ["recommendedCourses"],
    queryFn: fetchRecommendedCourses,
    staleTime: 1000 * 60 * 5, // 缓存 5 分钟
  });
}

// 加入课程 Hook
export function useJoinCourse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ message: string }, Error, { courseId: string; inviteCode?: string }>({
    mutationFn: ({ courseId, inviteCode }) => joinCourse(courseId, inviteCode),
    onSuccess: (data) => {
      // 加入课程成功后刷新已注册课程
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });

      toast({
        title: "Success",
        description: data.message || "Successfully joined the course!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
