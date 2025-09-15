"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";

//TODO: place in a common file and import
export interface Achievement {
  id: number;
  public_id: string;
  code: string;
  name: string;
  description?: string;
  unlocked?: boolean;
  unlocked_at?: string;
}

// TODOL : move to lib/api.ts
const COMMUNITY_ACHIEVEMENT_API = {
  all: "/api/community/achievements", // 获取所有成就定义
  user: (userId: string | number) =>
    `/api/community/users/${userId}/achievements`, // 获取某用户成就
  unlock: (achievementId: number) =>
    `/api/community/achievements/${achievementId}/unlock`, // 解锁成就
  revoke: (achievementId: number) =>
    `/api/community/achievements/${achievementId}/revoke`, // 撤销成就
};

//get all achievements
export const useAchievements = () => {
  const {
    data: achievements,
    isLoading,
    isError,
    error,
  } = useQuery<Achievement[], Error>({
    queryKey: ["achievements"],
    queryFn: () => apiGet<Achievement[]>(COMMUNITY_ACHIEVEMENT_API.all),
    staleTime: 1000 * 60 * 5,
  });

  return {
    achievements,
    isLoading,
    isError,
    error,
  };
};

//get user achievements
export const useUserAchievements = (userId: string | number) => {
  const {
    data: achievements,
    isLoading,
    isError,
    error,
  } = useQuery<Achievement[], Error>({
    queryKey: ["userAchievements", userId],
    queryFn: () =>
      apiGet<Achievement[]>(COMMUNITY_ACHIEVEMENT_API.user(userId)),
    enabled: !!userId, // userId 存在时才请求
    staleTime: 1000 * 60 * 2,
  });

  return {
    achievements,
    isLoading,
    isError,
    error,
  };
};

//unlock achievement for user
export const useUnlockAchievement = (userId: string | number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (achievementId: number) =>
      apiSend<Achievement>({
        url: COMMUNITY_ACHIEVEMENT_API.unlock(achievementId),
        method: "POST",
        body: { userId }, // 先放 placeholder，实际看后端需要什么
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAchievements", userId] });
    },
  });
};

//revoke achievement for user
export const useRevokeAchievement = (userId: string | number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (achievementId: number) =>
      apiSend({
        url: COMMUNITY_ACHIEVEMENT_API.revoke(achievementId),
        method: "DELETE",
        body: { userId }, // 先放 placeholder
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAchievements", userId] });
    },
  });
};
