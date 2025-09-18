import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Lock, CheckCircle, User, Eye } from "lucide-react";
import type { CommunityQuiz } from "@/interface/community/quiz-interface";
import { useUserAttemptStatus } from "@/hooks/community/use-quiz";
import { useUser } from "@/hooks/profile/use-user";

interface QuizCardProps {
  quiz: CommunityQuiz;
}

export default function QuizCard({ quiz }: QuizCardProps) {
  const { data: attemptStatus, isLoading: statusLoading } = useUserAttemptStatus(quiz.slug);
  const { data: currentUser } = useUser();
  const router = useRouter();

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
  const isAuthor = attemptStatus?.isAuthor || currentUser?.id === quiz.author_id;

  const handleCardClick = () => {
    router.push(`/community/quizzes/${quiz.slug}`);
  };

  return (
    <Card 
      className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 relative cursor-pointer" 
      onClick={handleCardClick}
    >
      <div className="absolute top-3 right-3 flex gap-2">
        <Badge className="bg-red-500 text-white">{difficultyLabel}</Badge>
        {isPrivate && (
          <Badge className="bg-orange-500 text-white flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Private
          </Badge>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
        
        {/* Author info */}
        {quiz.author && (
          <div className="flex items-center gap-2 mt-3 mb-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={quiz.author.avatar_url || ''} alt={quiz.author.display_name || ''} />
              <AvatarFallback className="text-xs">
                {quiz.author.display_name?.charAt(0) || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-500">
              by {quiz.author.display_name || 'Anonymous'}
              {isAuthor && <span className="text-blue-600 font-medium"> (You)</span>}
            </span>
          </div>
        )}
        
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
            {isAuthor ? (
              <span className="text-blue-600">Author Preview</span>
            ) : (
              <span>{attemptCount}/{maxAttempts} attempts used</span>
            )}
          </div>
        )}
        
        {/* 按钮区域 */}
        <div className="flex justify-end w-full">
          {statusLoading ? (
            <Button size="sm" disabled className="rounded-lg">
              Loading...
            </Button>
          ) : attemptStatus?.canAttempt ? (
            <Button 
              size="sm" 
              className="rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/community/quizzes/${quiz.slug}/attempt`);
              }}
            >
              <Play className="h-4 w-4 mr-1" />
              {isAuthor ? "Preview" : "Start"}
            </Button>
          ) : (
            <Button size="sm" disabled className="rounded-lg">
              {attemptStatus?.accessReason === "no_permission" && (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Private
                </>
              )}
              {attemptStatus?.accessReason === "view_only_permission" && (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  View Only
                </>
              )}
              {attemptStatus?.accessReason === "max_attempts_reached" && (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completed
                </>
              )}
              {!attemptStatus?.accessReason && (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Private
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
