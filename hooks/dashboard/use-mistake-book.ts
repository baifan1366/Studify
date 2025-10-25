import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface MistakeEntry {
  id: string;
  user_id: string;
  course_id?: string;
  lesson_id?: string;
  mistake_content: string;
  analysis?: string;
  source_type: "quiz" | "assignment" | "manual" | "course_quiz" | "ai_solve";
  knowledge_points: string[];
  recommended_exercises?: any;
  created_at: string;
  updated_at?: string;
}

// 获取用户的错题本
export function useMistakeBook(
  options: {
    limit?: number;
    courseId?: string;
    knowledgePoint?: string;
  } = {}
) {
  return useQuery({
    queryKey: ["mistake-book", options],
    queryFn: async (): Promise<MistakeEntry[]> => {
      const params = new URLSearchParams();
      if (options.limit) params.set("limit", options.limit.toString());
      if (options.courseId) params.set("course_id", options.courseId);
      if (options.knowledgePoint)
        params.set("knowledge_point", options.knowledgePoint);

      const response = await fetch(`/api/mistake-book?${params.toString()}`);
      if (!response.ok) {
        throw new Error("fetch_failed");
      }

      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// 保存错题到错题本
export function useSaveMistake() {
  const queryClient = useQueryClient();
  const t = useTranslations("MistakeBookPage");

  return useMutation({
    mutationFn: async (params: {
      mistakeContent: string;
      analysis?: string;
      knowledgePoints?: string[];
      recommendedExercises?: any;
      courseId?: string;
      lessonId?: string;
      sourceType?:
        | "quiz"
        | "assignment"
        | "manual"
        | "course_quiz"
        | "ai_solve";
    }) => {
      const response = await fetch("/api/mistake-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "save_failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 刷新错题本列表
      queryClient.invalidateQueries({ queryKey: ["mistake-book"] });

      toast.success(t("save_success"), {
        description: t("save_success_desc"),
      });
    },
    onError: (error) => {
      console.error("Failed to save mistake:", error);
      toast.error(t("save_failed"), {
        description:
          error instanceof Error ? error.message : t("save_failed_desc"),
      });
    },
  });
}

// 删除错题
export function useDeleteMistake() {
  const queryClient = useQueryClient();
  const t = useTranslations("MistakeBookPage");

  return useMutation({
    mutationFn: async (mistakeId: string) => {
      const response = await fetch(`/api/mistake-book?id=${mistakeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "delete_failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // 刷新错题本列表
      queryClient.invalidateQueries({ queryKey: ["mistake-book"] });

      toast.success(t("delete_success"));
    },
    onError: (error) => {
      console.error("Failed to delete mistake:", error);
      toast.error(t("delete_failed"), {
        description:
          error instanceof Error ? error.message : t("delete_failed_desc"),
      });
    },
  });
}
