"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import QuizResultModal from "@/components/community/quiz/quiz-result-modal";
import { useQuizQuestions } from "@/hooks/community/use-quiz-questions";

export default function QuizResultPage() {
  const { quizSlug, attemptId } = useParams<{ quizSlug: string; attemptId: string }>();
  const router = useRouter();

  // 获取题目数量用于百分比展示
  const { data: questions, isLoading } = useQuizQuestions(quizSlug);
  const totalQuestions = useMemo(() => questions?.length ?? 0, [questions]);

  useEffect(() => {
    // 无有效 attemptId 直接返回 quiz 页面
    if (!attemptId) {
      router.replace(`/community/quizzes/${quizSlug}`);
    }
  }, [attemptId, quizSlug, router]);

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
