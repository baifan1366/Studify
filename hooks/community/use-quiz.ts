"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";
import { CommunityQuiz } from "@/interface/community/quiz-interface";

// API 路径常量
const QUIZ_API = {
  quizzes: "/api/community/quizzes",
  quizDetail: (slug: string) => `/api/community/quizzes/${slug}`,
  quizQuestions: (quizSlug: string) =>
    `/api/community/quizzes/${quizSlug}/questions`,
  quizAttempts: (quizSlug: string) =>
    `/api/community/quizzes/${quizSlug}/attempts`,
  quizLikes: (quizSlug: string) => `/api/community/quizzes/${quizSlug}/likes`,
  userAttempts: (quizSlug: string) => `/api/community/quizzes/${quizSlug}/user-attempts`,
};

// ✅ 所有 quiz 列表
export const useQuizzes = () => {
  return useQuery<CommunityQuiz[], Error>({
    queryKey: ["communityQuizzes"],
    queryFn: () => apiGet<CommunityQuiz[]>(QUIZ_API.quizzes),
    staleTime: 1000 * 60 * 5,
  });
};

// ✅ 单个 quiz 详情
export const useQuiz = (slug: string) => {
  return useQuery<CommunityQuiz, Error>({
    queryKey: ["communityQuiz", slug],
    queryFn: () => apiGet<CommunityQuiz>(QUIZ_API.quizDetail(slug)),
    staleTime: 1000 * 60 * 2,
  });
};

// ✅ 创建 quiz
export const useCreateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newQuiz: {
      title: string;
      description?: string;
      difficulty?: number;
      tags?: string[];
      max_attempts?: number;
      visibility?: 'public' | 'private';
      quiz_mode?: 'practice' | 'strict';
    }) =>
      apiSend<CommunityQuiz>({
        url: QUIZ_API.quizzes,
        method: "POST",
        body: newQuiz,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityQuizzes"] });
    },
  });
};

// // ✅ 更新 quiz
// export const useUpdateQuiz = (slug: string) => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: (updates: {
//       title?: string;
//       description?: string;
//       difficulty?: number;
//       tags?: string[];
//     }) =>
//       apiSend<CommunityQuiz>({
//         url: QUIZ_API.quizDetail(slug),
//         method: "PUT",
//         body: updates,
//       }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["communityQuiz", slug] });
//       queryClient.invalidateQueries({ queryKey: ["communityQuizzes"] });
//     },
//   });
// };

// // ✅ 删除 quiz
// export const useDeleteQuiz = (slug: string) => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: () =>
//       apiSend({
//         url: QUIZ_API.quizDetail(slug),
//         method: "DELETE",
//       }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["communityQuizzes"] });
//     },
//   });
// };

// // ✅ 点赞 quiz
// export const useLikeQuiz = (slug: string) => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: () =>
//       apiSend({
//         url: QUIZ_API.quizLikes(slug),
//         method: "POST",
//       }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["communityQuiz", slug] });
//       queryClient.invalidateQueries({ queryKey: ["communityQuizzes"] });
//     },
//   });
// };

// // ✅ 取消点赞 quiz
// export const useUnlikeQuiz = (slug: string) => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: () =>
//       apiSend({
//         url: QUIZ_API.quizLikes(slug),
//         method: "DELETE",
//       }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["communityQuiz", slug] });
//       queryClient.invalidateQueries({ queryKey: ["communityQuizzes"] });
//     },
//   });
// };

// 创建一次新的 attempt
export const useCreateQuizAttempt = (quizSlug: string) => {
  return useMutation({
    mutationFn: () =>
      apiSend<{ id: number; created_at: string }>({
        url: QUIZ_API.quizAttempts(quizSlug),
        method: "POST",
      }),
  });
};

// 提交单个问题答案
export const useSubmitAnswer = (quizSlug: string, attemptId: number) => {
  return useMutation({
    mutationFn: (payload: { question_id: string; user_answer: string[] }) =>
      apiSend<{ id: number; is_correct: boolean }>({
        url: `${QUIZ_API.quizAttempts(quizSlug)}/${attemptId}/answers`,
        method: "POST",
        body: payload,
      }),
  });
};

// 完成 attempt（交卷）
export const useCompleteAttempt = (quizSlug: string, attemptId: number) => {
  return useMutation({
    mutationFn: () =>
      apiSend<{ total: number; correct: number }>({
        url: `${QUIZ_API.quizAttempts(quizSlug)}/${attemptId}/complete`,
        method: "POST",
      }),
  });
};

// 检查用户的尝试状态
export const useUserAttemptStatus = (quizSlug: string) => {
  return useQuery<{ 
    attemptCount: number; 
    maxAttempts: number; 
    canAttempt: boolean;
    accessReason: string;
    isAuthor: boolean;
    userPermission: 'view' | 'attempt' | 'edit' | null;
    quiz: Pick<CommunityQuiz, 'max_attempts' | 'visibility' | 'quiz_mode'>;
  }, Error>({
    queryKey: ["userAttemptStatus", quizSlug],
    queryFn: () => apiGet(QUIZ_API.userAttempts(quizSlug)),
    staleTime: 1000 * 30, // 30秒缓存
  });
};
