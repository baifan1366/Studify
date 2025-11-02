"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuiz } from "@/hooks/community/use-quiz";
import SingleQuizContent from "@/components/community/quiz/single/single-quiz-content";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function QuizDetailPage() {
  const { quizSlug } = useParams<{ quizSlug: string }>();
  const { data: quiz, isLoading, error } = useQuiz(quizSlug);
  const t = useTranslations('QuizDetailPage');

  useEffect(() => {
    if (quiz?.title) {
      document.title = `${quiz.title} | Quiz`;
    }
  }, [quiz?.title]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('quiz_not_found')}</h2>
              <p className="text-gray-600 mb-4">
                {error?.message || t('quiz_not_found_description')}
              </p>
              <a
                href="/community/quizzes"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {t('browse_other_quizzes')}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SingleQuizContent quiz={quiz} />;
}
