import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import MegaImage from "@/components/attachment/mega-blob-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Lock, CheckCircle, User, Eye, BookOpen, GraduationCap, MoreVertical, Trash2, Edit, AlertTriangle } from "lucide-react";
import type { CommunityQuiz } from "@/interface/community/quiz-interface";
import { useUserAttemptStatus } from "@/hooks/community/use-quiz";
import { useUser } from "@/hooks/profile/use-user";
import DeleteQuizModal from "@/components/community/quiz/delete-quiz-modal";
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { getSubjectName, getGradeName } from "@/utils/quiz/translation-utils";

interface QuizCardProps {
  quiz: CommunityQuiz & { question_count?: number };
  showWarning?: boolean; // For "My Quizzes" tab
}

// Helper function to format code for display
function formatCode(code: string): string {
  // Convert snake_case to Title Case
  return code
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function QuizCard({ quiz, showWarning = false }: QuizCardProps) {
  const t = useTranslations('QuizCard');
  const locale = useLocale();
  const { data: attemptStatus, isLoading: statusLoading } = useUserAttemptStatus(quiz.slug);
  const { data: currentUser } = useUser();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const isTutor = currentUser?.profile?.role === 'tutor';
  
  // difficulty label: convert number -> text if needed
  const difficultyLabel = (() => {
    if (typeof quiz.difficulty === "number") {
      const difficultyMap: { [key: number]: string } = {
        1: "easy",
        2: "fair",
        3: "good",
        4: "hard",
        5: "expert"
      };
      const key = difficultyMap[quiz.difficulty];
      if (key) {
        return t(`difficulty_levels.${key}` as const);
      }
      return t("difficulty_levels.custom_number", { value: quiz.difficulty });
    }
    if (quiz.difficulty) {
      return t("difficulty_levels.custom_text", { value: String(quiz.difficulty) });
    }
    return t("difficulty_levels.unknown");
  })();

  const subjectName = quiz.subject ? getSubjectName(quiz.subject, locale) : undefined;
  const gradeName = quiz.grade ? getGradeName(quiz.grade, locale) : undefined;


  // 确定按钮状态
  const canAttempt = attemptStatus?.canAttempt ?? true;
  const attemptCount = attemptStatus?.attemptCount ?? 0;
  const maxAttempts = attemptStatus?.maxAttempts ?? quiz.max_attempts;
  const isPrivate = quiz.visibility === 'private';
  const isAuthor = attemptStatus?.isAuthor || currentUser?.id === quiz.author_id;

  const handleCardClick = (e: React.MouseEvent) => {
    // 防止在 Modal 关闭过程中触发导航
    if (isModalClosing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // 检查点击是否来自 Modal 相关元素
    const target = e.target as HTMLElement;
    if (target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content-wrapper]')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const route = isTutor
      ? `/tutor/community/quizzes/${quiz.slug}`
      : `/community/quizzes/${quiz.slug}`;
    router.push(route);
  };

  return (
      <Card
        className="h-full flex flex-col justify-between relative cursor-pointer 
        bg-white/5 backdrop-blur-lg border border-white/10 text-white 
        rounded-xl shadow-lg hover:bg-white/10 transition-all duration-200"
        onClick={handleCardClick}
      >
      <div className="absolute top-3 right-3 flex gap-2 items-center">
        <Badge className="bg-red-500 text-white">{difficultyLabel}</Badge>
        {isPrivate && (
          <Badge className="bg-orange-500 text-white flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {t("badges.private")}
          </Badge>
        )}
        
        {/* Warning indicator for quizzes with no questions */}
        {showWarning && quiz.question_count === 0 && (
          <div className="relative group">
            <AlertTriangle className="h-5 w-5 text-amber-500 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              This quiz is not valid and will not be shown to community users as it has no question inside.
              <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
        
        {/* Author actions dropdown */}
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  const route = isTutor
                    ? `/tutor/community/quizzes/${quiz.slug}/edit`
                    : `/community/quizzes/${quiz.slug}/edit`;
                  router.push(route);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t("actions.edit_quiz")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("actions.delete_quiz")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              {quiz.author.avatar_url && quiz.author.avatar_url.includes('mega.nz') ? (
                <MegaImage
                  megaUrl={quiz.author.avatar_url}
                  alt={quiz.author.display_name || ''}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <AvatarImage src={quiz.author.avatar_url || ''} alt={quiz.author.display_name || ''} />
              )}
              <AvatarFallback className="text-xs">
                {quiz.author.display_name?.charAt(0) || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-500">
              {t("author_by", { name: quiz.author.display_name || t("unknown_author") })}
              {isAuthor && <span className="text-blue-600 font-medium"> {t("you_suffix")}</span>}
            </span>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-3">
          {quiz.subject && quiz.subject.code && (
            <Badge variant="outline" className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {subjectName || formatCode(quiz.subject.code)}
            </Badge>
          )}
          {quiz.grade && quiz.grade.code && (
            <Badge variant="outline" className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {gradeName || formatCode(quiz.grade.code)}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto px-4 pb-4 flex flex-col gap-2">
        {/* 显示尝试次数信息 */}
        {!statusLoading && attemptStatus && (
          <div className="text-xs text-gray-500 text-center">
            {isAuthor ? (
              <span className="text-blue-600">{t("author_preview")}</span>
            ) : (
              <span>
                {maxAttempts && maxAttempts > 0
                  ? t("attempts_used", { used: attemptCount, max: maxAttempts })
                  : t("attempts_used_unlimited", { used: attemptCount })}
              </span>
            )}
          </div>
        )}
        
        {/* 按钮区域 */}
        <div className="flex justify-end w-full">
          {statusLoading ? (
            <Button size="sm" disabled className="rounded-lg">
              {t("loading")}
            </Button>
          ) : attemptStatus?.canAttempt ? (
            <Button 
              size="sm" 
              className="rounded-lg"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  let attemptId: number | null = null;
                  let sessionPublicId: string | null = null;

                  // Check current attempt
                  const cur = await fetch(`/api/community/quizzes/${quiz.slug}/current-attempt`);
                  if (cur.ok) {
                    const data = await cur.json();
                    if (data?.hasCurrentAttempt) {
                      attemptId = data.currentAttempt?.id ?? null;
                      sessionPublicId = data.session?.public_id ?? null;
                    }
                  }

                  // Create attempt if missing
                  if (!attemptId) {
                    const res = await fetch(`/api/community/quizzes/${quiz.slug}/attempts`, { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to create attempt');
                    const attempt = await res.json();
                    attemptId = attempt?.id ?? null;
                  }

                  // Create session if missing
                  if (!sessionPublicId && attemptId) {
                    const sres = await fetch(`/api/community/quizzes/${quiz.slug}/attempts/${attemptId}/session`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({})
                    });
                    if (!sres.ok) throw new Error('Failed to create session');
                    const s = await sres.json();
                    sessionPublicId = s?.public_id ?? null;
                  }

                  if (sessionPublicId) {
                    const route = isTutor
                      ? `/tutor/community/quizzes/${quiz.slug}/attempt?session=${sessionPublicId}`
                      : `/community/quizzes/${quiz.slug}/attempt?session=${sessionPublicId}`;
                    router.push(route);
                  } else {
                    const route = isTutor
                      ? `/tutor/community/quizzes/${quiz.slug}/attempt`
                      : `/community/quizzes/${quiz.slug}/attempt`;
                    router.push(route);
                  }
                } catch (err) {
                  console.error(err);
                  const route = isTutor
                    ? `/tutor/community/quizzes/${quiz.slug}/attempt`
                    : `/community/quizzes/${quiz.slug}/attempt`;
                  router.push(route);
                }
              }}
            >
              <Play className="h-4 w-4 mr-1" />
              {attemptStatus?.hasInProgressAttempt
                ? t("actions.continue")
                : (isAuthor ? t("actions.preview") : t("actions.start"))}
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
      
      {/* Delete Modal */}
      {isAuthor && (
        <DeleteQuizModal 
          quizSlug={quiz.slug} 
          quizTitle={quiz.title}
          isOpen={showDeleteModal}
          onOpenChange={(open) => {
            if (!open) {
              // 设置关闭状态，防止事件冒泡触发导航
              setIsModalClosing(true);
              setTimeout(() => {
                setIsModalClosing(false);
              }, 100); // 短暂延迟确保事件处理完成
            }
            setShowDeleteModal(open);
          }}
          onDeleteSuccess={() => {
            // The quiz will be removed from the list automatically due to cache invalidation
          }}
        />
      )}
    </Card>
  );
}
