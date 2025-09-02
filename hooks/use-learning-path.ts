import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningPathApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

// 学习路径类型定义
export interface LearningPath {
  id: string;
  goal: string;
  duration: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// 里程碑类型定义
export interface Milestone {
  id: string;
  title: string;
  description: string;
  order: number;
  status: 'locked' | 'in-progress' | 'completed';
  locked: boolean;
  resourceType?: string;
  resourceId?: string;
  prerequisites?: any;
  reward?: any;
}

// 奖励类型定义
export interface Reward {
  badge?: { id: string };
  points?: number;
  message: string;
}

/**
 * 获取用户学习路径
 * @param userId 用户ID
 */
export const useLearningPath = (userId: string) => {
  return useQuery({
    queryKey: ['learningPath', userId],
    queryFn: async () => {
      const response = await fetch(learningPathApi.getByUserId(userId));
      if (!response.ok) {
        throw new Error('获取学习路径失败');
      }
      return response.json();
    },
    select: (data) => ({
      path: data.path,
      milestones: data.milestones,
    }),
  });
};

/**
 * 生成学习路径
 */
export const useGenerateLearningPath = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goal, duration }: { goal: string; duration: number }) => {
      const response = await fetch(learningPathApi.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal, duration }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成学习路径失败');
      }

      return response.json();
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: '成功',
        description: '学习路径已生成',
      });
      queryClient.invalidateQueries({ queryKey: ['learningPath'] });
    },
    onError: (error) => {
      toast({
        title: '错误',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * 更新里程碑进度
 */
export const useUpdateMilestoneProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pathId,
      milestoneId,
      status,
    }: {
      pathId: string;
      milestoneId: string;
      status: 'in-progress' | 'completed';
    }) => {
      const response = await fetch(learningPathApi.updateProgress(pathId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新进度失败');
      }

      return response.json();
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: '成功',
        description: '进度已更新',
      });
      queryClient.invalidateQueries({ queryKey: ['learningPath'] });
    },
    onError: (error) => {
      toast({
        title: '错误',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * 解锁下一个里程碑
 */
export const useUnlockNextMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pathId, milestoneId }: { pathId: string; milestoneId: string }) => {
      const response = await fetch(learningPathApi.unlock(pathId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '解锁里程碑失败');
      }

      return response.json();
    },
    onSuccess: (data, variables, context) => {
      if (data.unlocked) {
        toast({
          title: '成功',
          description: `已解锁：${data.nextMilestone?.title || '下一个里程碑'}`,
        });
        queryClient.invalidateQueries({ queryKey: ['learningPath'] });
      }
    },
    onError: (error) => {
      toast({
        title: '错误',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * 获取里程碑奖励
 */
export const useClaimReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pathId, milestoneId }: { pathId: string; milestoneId: string }) => {
      const response = await fetch(learningPathApi.reward(pathId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取奖励失败');
      }

      return response.json();
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: '恭喜！',
        description: data.message || '你获得了奖励',
      });
      queryClient.invalidateQueries({ queryKey: ['learningPath'] });
    },
    onError: (error) => {
      toast({
        title: '错误',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};