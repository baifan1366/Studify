"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuizQuestions } from "@/hooks/community/use-quiz-questions";
import Link from "next/link";

export default function QuizSidebar({ quizSlug }: { quizSlug: string }) {
  const { data: questions, isLoading } = useQuizQuestions(quizSlug);

  return (
    <div className="w-80 space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Quiz Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-white/10" />
            ))
          ) : questions && questions.length > 0 ? (
            questions.map((q, idx) => (
              <div
                key={q.public_id}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm truncate">
                    {idx + 1}. {q.question_text}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs border-blue-400 text-blue-400"
                  >
                    {q.question_type.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No questions added yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
