"use client";

import { useParams } from "next/navigation";
import { useQuiz } from "@/hooks/community/use-quiz";
import SingleQuizContent from "@/components/community/quiz/single/single-quiz-content";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { CommunityQuiz } from "@/interface/community/quiz-interface";

export default function QuizDetailPage() {
  const { quizSlug } = useParams<{ quizSlug: string }>();
  const { data: quiz, isLoading, error } = useQuiz(quizSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
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
              <h2 className="text-xl font-semibold mb-2">Quiz Not Found</h2>
              <p className="text-gray-600 mb-4">
                {error?.message || "The quiz you're looking for doesn't exist or has been removed."}
              </p>
              <a 
                href="/community/quizzes" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Browse Other Quizzes
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SingleQuizContent quiz={quiz} />;
}
