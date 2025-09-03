"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { learningPathApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
export const useGenerateLearningPath = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ message: string }, Error, { goal: string; duration: number }>({
    mutationFn: ({ goal, duration }) => generateLearningPath(goal, duration),
    onSuccess: () => {
      toast({
        title: "成功",
        description: "学习路径已生成",
      });
      queryClient.invalidateQueries({ queryKey: ["learningPath"] });
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// 更新里程碑进度 Hook
export const useUpdateMilestoneProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { message: string },
    Error,
    { pathId: string; milestoneId: string; status: "in-progress" | "completed" }
  >({
    mutationFn: ({ pathId, milestoneId, status }) =>
      updateMilestoneProgress(pathId, milestoneId, status),
    onSuccess: () => {
      toast({
        title: "成功",
        description: "进度已更新",
      });
      queryClient.invalidateQueries({ queryKey: ["learningPath"] });
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// 解锁下一个里程碑 Hook
export const useUnlockNextMilestone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { unlocked: boolean; nextMilestone?: Milestone },
    Error,
    { pathId: string; milestoneId: string }
  >({
    mutationFn: ({ pathId, milestoneId }) =>
      unlockNextMilestone(pathId, milestoneId),
    onSuccess: (data) => {
      if (data.unlocked) {
        toast({
          title: "成功",
          description: `已解锁：${data.nextMilestone?.title || "下一个里程碑"}`,
        });
        queryClient.invalidateQueries({ queryKey: ["learningPath"] });
      }
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// 获取奖励 Hook
export const useClaimReward = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ message: string }, Error, { pathId: string; milestoneId: string }>({
    mutationFn: ({ pathId, milestoneId }) => claimReward(pathId, milestoneId),
    onSuccess: (data) => {
      toast({
        title: "恭喜！",
        description: data.message || "你获得了奖励",
      });
      queryClient.invalidateQueries({ queryKey: ["learningPath"] });
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
