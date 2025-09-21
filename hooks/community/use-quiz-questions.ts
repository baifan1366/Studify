import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CommunityQuizQuestion } from "@/interface/community/quiz-interface";

async function fetchQuizQuestions(quizSlug: string) {
  const res = await fetch(`/api/community/quizzes/${quizSlug}/questions`);
  if (!res.ok) throw new Error("Failed to fetch quiz questions");
  return res.json();
}

async function createQuizQuestion(quizSlug: string, payload: any) {
  const res = await fetch(`/api/community/quizzes/${quizSlug}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create question");
  return res.json();
}

async function updateQuizQuestion(quizSlug: string, questionSlug: string, payload: any) {
  const res = await fetch(`/api/community/quizzes/${quizSlug}/questions/${questionSlug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update question");
  return res.json();
}

async function deleteQuizQuestion(quizSlug: string, questionSlug: string) {
  const res = await fetch(`/api/community/quizzes/${quizSlug}/questions/${questionSlug}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete question");
  return res.json();
}

export function useQuizQuestions(quizSlug: string) {
  return useQuery<CommunityQuizQuestion[]>({
    queryKey: ["quizQuestions", quizSlug],
    queryFn: () => fetchQuizQuestions(quizSlug),
  });
}

export function useCreateQuizQuestion(quizSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => createQuizQuestion(quizSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizQuestions", quizSlug] });
    },
  });
}

export function useUpdateQuizQuestion(quizSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionSlug, payload }: { questionSlug: string; payload: any }) => 
      updateQuizQuestion(quizSlug, questionSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizQuestions", quizSlug] });
    },
  });
}

export function useDeleteQuizQuestion(quizSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionSlug: string) => deleteQuizQuestion(quizSlug, questionSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizQuestions", quizSlug] });
    },
  });
}
