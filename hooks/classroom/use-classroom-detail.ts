"use client";

import { useQuery } from "@tanstack/react-query";
import { classroomApi } from "@/lib/api";
import { apiGet } from "@/lib/api-config"; // ✅ Keep only apiGet, remove apiSend

// 课程详情接口
export interface ClassroomDetail {
  id: string;
  title: string;
  description: string;
  tutorId: string;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  enrolledCount: number;
  status: "active" | "archived" | "draft";
  // 其他课程详情字段
}

/**
 * 获取课程详情的hook
 * @param classroomId 课程ID
 */
export function useClassroomDetail(classroomId: string) {
  return useQuery<ClassroomDetail>({
    queryKey: ["classroom", classroomId],
    queryFn: () => apiGet<ClassroomDetail>(classroomApi.detail(classroomId)), // ✅ Use apiGet
    enabled: !!classroomId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
