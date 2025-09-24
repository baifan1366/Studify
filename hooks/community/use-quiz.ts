"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";
import { CommunityQuiz, CommunityQuizSubject, CommunityQuizGrade } from "@/interface/community/quiz-interface";
import { QuizSearchParams, buildSearchQueryParams } from "@/utils/quiz/search-utils";

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
  attemptScore: (attemptId: number) => `/api/community/quizzes/attempts/${attemptId}/score`,
  subjects: "/api/community/quizzes/subjects",
  grades: "/api/community/quizzes/grades",
  search: "/api/community/quizzes/search",
};

// ✅ 所有 quiz 列表
export const useQuizzes = (tab?: string, filters?: {
  subject_id?: number;
  grade_id?: number;
  difficulty?: number;
}) => {
  const getQuizUrl = () => {
    const params = new URLSearchParams();
    
    if (tab === "popular") {
      params.append("filter", "popular");
    } else if (tab === "mine") {
      params.append("filter", "mine");
    }
    
    // Add filters
    if (filters?.subject_id) {
      params.append("subject_id", filters.subject_id.toString());
    }
    if (filters?.grade_id) {
      params.append("grade_id", filters.grade_id.toString());
    }
    if (filters?.difficulty) {
      params.append("difficulty", filters.difficulty.toString());
    }
    
    const queryString = params.toString();
    return queryString ? `${QUIZ_API.quizzes}?${queryString}` : QUIZ_API.quizzes;
  };

  return useQuery<CommunityQuiz[], Error>({
    queryKey: ["communityQuizzes", tab, filters],
    queryFn: () => apiGet<CommunityQuiz[]>(getQuizUrl()),
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
      subject_id?: number;
      grade_id?: number;
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
export const useUpdateQuiz = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: {
      title?: string;
      description?: string;
      difficulty?: number;
      tags?: string[];
      visibility?: 'public' | 'private';
      max_attempts?: number;
      time_limit_minutes?: number | null;
      subject_id?: number;
      grade_id?: number;
    }) =>
      apiSend<CommunityQuiz>({
        url: QUIZ_API.quizDetail(slug),
        method: "PATCH",
        body: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityQuiz", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityQuizzes"] });
    },
  });
};

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
      apiSend<{ total: number; correct: number; score: number; percentage: number }>({
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
    hasInProgressAttempt: boolean;
    quiz: Pick<CommunityQuiz, 'max_attempts' | 'visibility'>;
  }, Error>({
    queryKey: ["userAttemptStatus", quizSlug],
    queryFn: () => apiGet(QUIZ_API.userAttempts(quizSlug)),
    staleTime: 1000 * 30, // 30秒缓存
  });
};

// 获取当前进行中的 attempt
export const useCurrentAttempt = (quizSlug: string) => {
  return useQuery<{
    hasCurrentAttempt: boolean;
    currentAttempt: {
      id: number;
      status: string;
      created_at: string;
      score: number;
      progress: {
        answered: number;
        total: number;
        correct: number;
        percentage: number;
        current_question_index: number;
      };
    } | null;
    session: {
      id: number;
      session_token: string;
      status: string;
      time_limit_minutes: number | null;
      time_spent_seconds: number;
      current_question_index: number;
      remaining_seconds: number | null;
      is_expired: boolean;
      started_at: string;
      last_activity_at: string;
    } | null;
  }, Error>({
    queryKey: ["currentAttempt", quizSlug],
    queryFn: () => apiGet(`/api/community/quizzes/${quizSlug}/current-attempt`),
    staleTime: 1000 * 10, // 10秒缓存
  });
};

// ✅ 获取测验分数 - 根据 attemptId 计算答对题目的总数
export const useQuizScore = (attemptId: number | null) => {
  return useQuery<{ score: number }, Error>({
    queryKey: ["quizScore", attemptId],
    queryFn: () => {
      if (!attemptId) {
        throw new Error("Attempt ID is required");
      }
      return apiGet<{ score: number }>(QUIZ_API.attemptScore(attemptId));
    },
    enabled: !!attemptId, // 只有当 attemptId 存在时才执行查询
    staleTime: 1000 * 60 * 2, // 2分钟缓存
  });
};

// ✅ 获取所有学科
export const useQuizSubjects = () => {
  return useQuery<CommunityQuizSubject[], Error>({
    queryKey: ["quizSubjects"],
    queryFn: () => apiGet<CommunityQuizSubject[]>(QUIZ_API.subjects),
    staleTime: 1000 * 60 * 30, // 30分钟缓存，学科变化不频繁
  });
};

// ✅ 获取所有年级
export const useQuizGrades = () => {
  return useQuery<CommunityQuizGrade[], Error>({
    queryKey: ["quizGrades"],
    queryFn: () => apiGet<CommunityQuizGrade[]>(QUIZ_API.grades),
    staleTime: 1000 * 60 * 30, // 30分钟缓存，年级变化不频繁
  });
};

// ✅ 搜索 quiz
export const useSearchQuizzes = (searchParams: QuizSearchParams) => {
  const queryParams = buildSearchQueryParams(searchParams);
  const url = `${QUIZ_API.search}?${queryParams.toString()}`;
  
  return useQuery<CommunityQuiz[], Error>({
    queryKey: ["searchQuizzes", searchParams],
    queryFn: () => apiGet<CommunityQuiz[]>(url),
    enabled: !!searchParams.query, // 只有当有搜索查询时才执行
    staleTime: 1000 * 60 * 2, // 2分钟缓存
  });
};

// ✅ 创建学科（仅管理员）
export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSubject: {
      code: string;
      translations: { [locale: string]: string };
    }) =>
      apiSend<CommunityQuizSubject>({
        url: QUIZ_API.subjects,
        method: "POST",
        body: newSubject,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizSubjects"] });
    },
  });
};

// ✅ 创建年级（仅管理员）
export const useCreateGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newGrade: {
      code: string;
      translations: { [locale: string]: string };
    }) =>
      apiSend<CommunityQuizGrade>({
        url: QUIZ_API.grades,
        method: "POST",
        body: newGrade,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizGrades"] });
    },
  });
};
