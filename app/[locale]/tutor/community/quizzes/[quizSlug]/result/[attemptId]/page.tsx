"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import QuizResultModal from "@/components/community/quiz/quiz-result-modal";
import { useQuizQuestions } from "@/hooks/community/use-quiz-questions";
import { useUser } from "@/hooks/profile/use-user";
import { useQuiz } from "@/hooks/community/use-quiz";

export default function QuizResultPage() {
  const { quizSlug, attemptId } = useParams<{ quizSlug: string; attemptId: string }>();
  const router = useRouter();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';

  // 获取测验信息
  const { data: quiz } = useQuiz(quizSlug);
  
  // 获取题目数量用于百分比展示
  const { data: questions, isLoading } = useQuizQuestions(quizSlug);
  const totalQuestions = useMemo(() => questions?.length ?? 0, [questions]);

  // Update document title with quiz name
  useEffect(() => {
    if (quiz?.title) {
      document.title = `${quiz.title} | Result`;
    }
  }, [quiz?.title]);

  useEffect(() => {
    // 无有效 attemptId 直接返回 quiz 页面
    if (!attemptId) {
      const route = isTutor
        ? `/tutor/community/quizzes/${quizSlug}`
        : `/community/quizzes/${quizSlug}`;
      router.replace(route);
    }
  }, [attemptId, quizSlug, router, isTutor]);

  return (
    <div className="min-h-screen w-full bg-background">
      <QuizResultModal 
        quizSlug={quizSlug}
        attemptId={attemptId ? parseInt(attemptId) : null}
        totalQuestions={totalQuestions}
        open={!isLoading}
      />
    </div>
  );
}
