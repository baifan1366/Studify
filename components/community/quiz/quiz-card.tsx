import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Lock, CheckCircle } from "lucide-react";
import type { CommunityQuiz } from "@/interface/community/quiz-interface";
import { useUserAttemptStatus } from "@/hooks/community/use-quiz";

interface QuizCardProps {
  quiz: CommunityQuiz;
}

export default function QuizCard({ quiz }: QuizCardProps) {
  const { data: attemptStatus, isLoading: statusLoading } = useUserAttemptStatus(quiz.slug);

  // difficulty label: convert number -> text if needed
  const difficultyLabel =
    typeof quiz.difficulty === "number"
      ? quiz.difficulty === 1
        ? "Easy"
        : quiz.difficulty === 2
        ? "Medium"
        : quiz.difficulty >= 3
        ? "Hard"
        : String(quiz.difficulty)
      : String(quiz.difficulty);

  // normalize tags to strings
  const tagStrings = (quiz.tags || []).map((t) =>
    typeof t === "string" ? t : (t as any).name || String(t)
  );

  // 确定按钮状态
  const canAttempt = attemptStatus?.canAttempt ?? true;
  const attemptCount = attemptStatus?.attemptCount ?? 0;
  const maxAttempts = attemptStatus?.maxAttempts ?? quiz.max_attempts;
  const isPrivate = quiz.visibility === 'private';

  return (
    <Card className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 relative">
      <div className="absolute top-3 right-3">
        <Badge className="bg-red-500 text-white">{difficultyLabel}</Badge>
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {tagStrings.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline">
              {tag}
            </Badge>
          ))}
          {tagStrings.length > 3 && (
            <Badge variant="outline">+{tagStrings.length - 3}</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto px-4 pb-4 flex flex-col gap-2">
        {/* 显示尝试次数信息 */}
        {!statusLoading && attemptStatus && (
          <div className="text-xs text-gray-500 text-center">
            {attemptCount}/{maxAttempts} attempts used
          </div>
        )}
        
        {/* 按钮区域 */}
        <div className="flex justify-end w-full">
          {statusLoading ? (
            <Button size="sm" disabled className="rounded-lg">
              Loading...
            </Button>
          ) : isPrivate ? (
            <Button size="sm" disabled className="rounded-lg">
              <Lock className="h-4 w-4 mr-1" />
              Private
            </Button>
          ) : !canAttempt ? (
            <Button size="sm" disabled className="rounded-lg">
              <CheckCircle className="h-4 w-4 mr-1" />
              Completed
            </Button>
          ) : (
            <Link href={`/community/quizzes/${quiz.slug}/attempt`}>
              <Button size="sm" className="rounded-lg">
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
