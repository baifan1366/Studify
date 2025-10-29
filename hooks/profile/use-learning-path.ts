"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { learningPathApi } from "@/lib/api";
import { apiGet, apiSend } from "@/lib/api-config";

// =====================
// Type Definitions
// =====================

export interface LearningPath {
  id: string;
  goal: string;
  duration: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  order: number;
  status: "locked" | "in-progress" | "completed";
  locked: boolean;
  resourceType?: string;
  resourceId?: string;
  prerequisites?: any;
  reward?: any;
}

export interface Reward {
  badge?: { id: string };
  points?: number;
  message: string;
}

// =====================
// API Functions
// =====================

// 获取用户学习路径
const fetchLearningPath = (userId: string) =>
  apiGet<{ path: LearningPath; milestones: Milestone[] }>(
    learningPathApi.getByUserId(userId)
  );

// 生成学习路径
const generateLearningPath = (goal: string, duration: number) =>
  apiSend<{ message: string }>({
    url: learningPathApi.generate,
    method: "POST",
    body: { goal, duration },
  });

// 更新里程碑进度
const updateMilestoneProgress = (
  pathId: string,
  milestoneId: string,
  status: "in-progress" | "completed"
) =>
  apiSend<{ message: string }>({
    url: learningPathApi.updateProgress(pathId),
    method: "PATCH",
    body: { milestoneId, status },
  });

// 解锁下一个里程碑
const unlockNextMilestone = (pathId: string, milestoneId: string) =>
  apiSend<{ unlocked: boolean; nextMilestone?: Milestone }>({
    url: learningPathApi.unlock(pathId),
    method: "POST",
    body: { milestoneId },
  });

// 获取里程碑奖励
const claimReward = (pathId: string, milestoneId: string) =>
  apiSend<{ message: string }>({
    url: learningPathApi.reward(pathId),
    method: "POST",
    body: { milestoneId },
  });

// =====================
// React Query Hooks
// =====================

// 获取学习路径 Hook
export const useLearningPath = (userId: string) => {
  return useQuery({
    queryKey: ["learningPath", userId],
    queryFn: () => fetchLearningPath(userId),
    select: (data) => ({
      id: data.path.id,
      goal: data.path.goal,
      progress: data.path.progress,
      milestones: data.milestones,
    }),
  });
};

// 生成学习路径 Hook
// Note: Toast messages should be handled in the component using translations
export const useGenerateLearningPath = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { goal: string; duration: number }
  >({
    mutationFn: ({ goal, duration }) => generateLearningPath(goal, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learningPath"] });
    },
    // onError callback removed - handle in component with translations
  });
};

// 更新里程碑进度 Hook
// Note: Toast messages should be handled in the component using translations
export const useUpdateMilestoneProgress = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { pathId: string; milestoneId: string; status: "in-progress" | "completed" }
  >({
    mutationFn: ({ pathId, milestoneId, status }) =>
      updateMilestoneProgress(pathId, milestoneId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learningPath"] });
    },
    // onError callback removed - handle in component with translations
  });
};

// 解锁下一个里程碑 Hook
// Note: Toast messages should be handled in the component using translations
export const useUnlockNextMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { unlocked: boolean; nextMilestone?: Milestone },
    Error,
    { pathId: string; milestoneId: string }
  >({
    mutationFn: ({ pathId, milestoneId }) =>
      unlockNextMilestone(pathId, milestoneId),
    onSuccess: (data) => {
      if (data.unlocked) {
        queryClient.invalidateQueries({ queryKey: ["learningPath"] });
      }
    },
    // onError callback removed - handle in component with translations
  });
};

// 获取奖励 Hook
// Note: Toast messages should be handled in the component using translations
export const useClaimReward = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { pathId: string; milestoneId: string }
  >({
    mutationFn: ({ pathId, milestoneId }) => claimReward(pathId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learningPath"] });
    },
    // onError callback removed - handle in component with translations
  });
};
