import { useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Play, Share2, Lock, Eye, CheckCircle, Pencil, BookOpen, GraduationCap, Trash2 } from "lucide-react";
import { CommunityQuiz } from "@/interface/community/quiz-interface";
import { Hashtag } from "@/interface/community/post-interface";
import ShareQuizModal from "@/components/community/quiz/share-quiz-modal";
import DeleteQuizModal from "@/components/community/quiz/delete-quiz-modal";
import { useUser } from "@/hooks/profile/use-user";
import { useUserAttemptStatus } from "@/hooks/community/use-quiz";
import { useRouter, useParams } from "next/navigation";

// Helper function to format code for display
function formatCode(code: string): string {
  return code
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function QuizHeader({ quiz }: { quiz: CommunityQuiz }) {
  const t = useTranslations('QuizHeader');
  const { data: currentUser } = useUser();
  const { data: attemptStatus, isLoading: statusLoading } = useUserAttemptStatus(quiz.slug);
  const router = useRouter();
  const params = useParams();
  const isAuthor = currentUser?.id === quiz.author_id;
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isTutor = currentUser?.profile?.role === 'tutor';

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">
        {quiz.title}
      </h1>
      <div className="flex items-center mb-4">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage
            src={quiz.author?.avatar_url || ''}
            alt={quiz.author?.display_name || ''}
          />
          <AvatarFallback>{quiz.author?.display_name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">
            {quiz.author?.display_name}
            {isAuthor && <span className="text-blue-600 ml-2">{t('you')}</span>}
          </p>
          <p className="text-sm text-muted-foreground">{t('quiz_creator')}</p>
        </div>
      </div>
      <p className="text-lg text-muted-foreground mb-4">{quiz.description}</p>
      
      {/* Subject and Grade badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quiz.subject && quiz.subject.code && (
          <Badge variant="outline" className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {formatCode(quiz.subject.code)}
          </Badge>
        )}
        {quiz.grade && quiz.grade.code && (
          <Badge variant="outline" className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            {formatCode(quiz.grade.code)}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* 主要操作按钮 */}
        {statusLoading ? (
          <Button size="lg" disabled>
            Loading...
          </Button>
        ) : attemptStatus?.canAttempt ? (
          <Button 
            size="lg"
            disabled={isNavigating}
            onClick={async () => {
              if (isNavigating) return;
              setIsNavigating(true);
              try {
                // 1) Check current attempt and session
                let attemptId: number | null = null;
                let sessionPublicId: string | null = null;

                const cur = await fetch(`/api/community/quizzes/${quiz.slug}/current-attempt`);
                if (cur.ok) {
                  const data = await cur.json();
                  if (data?.hasCurrentAttempt) {
                    attemptId = data.currentAttempt?.id ?? null;
                    sessionPublicId = data.session?.public_id ?? null;
                  }
                }

                // 2) Create attempt if missing
                if (!attemptId) {
                  const res = await fetch(`/api/community/quizzes/${quiz.slug}/attempts`, {
                    method: 'POST',
                  });
                  if (!res.ok) throw new Error('Failed to create attempt');
                  const attempt = await res.json();
                  attemptId = attempt?.id ?? null;
                }

                // 3) Create session if missing
                if (!sessionPublicId && attemptId) {
                  const sres = await fetch(`/api/community/quizzes/${quiz.slug}/attempts/${attemptId}/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      browser_info: {
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                      }
                    })
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
                  // Fallback to guarded attempt page
                  const route = isTutor
                    ? `/tutor/community/quizzes/${quiz.slug}/attempt`
                    : `/community/quizzes/${quiz.slug}/attempt`;
                  router.push(route);
                }
              } catch (e) {
                console.error(e);
                const route = isTutor
                  ? `/tutor/community/quizzes/${quiz.slug}/attempt`
                  : `/community/quizzes/${quiz.slug}/attempt`;
                router.push(route);
              } finally {
                setIsNavigating(false);
              }
            }}
          >
            <Play className="h-5 w-5 mr-2" />
            {isNavigating ? "Starting..." : 
             attemptStatus?.hasInProgressAttempt ? "Continue Quiz" :
             (isAuthor ? "Preview Quiz" : "Start Quiz")}
          </Button>
        ) : (
          <Button size="lg" disabled>
            {attemptStatus?.accessReason === "no_permission" && (
              <>
                <Lock className="h-5 w-5 mr-2" />
                No Access
              </>
            )}
            {attemptStatus?.accessReason === "view_only_permission" && (
              <>
                <Eye className="h-5 w-5 mr-2" />
                View Only
              </>
            )}
            {attemptStatus?.accessReason === "max_attempts_reached" && (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Completed
              </>
            )}
            {!attemptStatus?.accessReason && (
              <>
                <Lock className="h-5 w-5 mr-2" />
                Unavailable
              </>
            )}
          </Button>
        )}
        
        {/* 权限信息显示 */}
        {attemptStatus && !isAuthor && (
          <div className="text-sm text-gray-600">
            {attemptStatus.userPermission && (
              <Badge variant="outline" className="capitalize">
                {attemptStatus.userPermission} Permission
              </Badge>
            )}
            {attemptStatus.accessReason === "granted_permission" && (
              <span className="ml-2">Access granted via invite</span>
            )}
          </div>
        )}
        
        {/* 分享按钮 */}
        {isAuthor ? (
          <ShareQuizModal 
            quizSlug={quiz.slug} 
            quizTitle={quiz.title}
            isAuthor={isAuthor}
            visibility={quiz.visibility}
          >
            <Button variant="outline">
              <Share2 className="h-5 w-5 mr-2" />
              {t('share')}
            </Button>
          </ShareQuizModal>
        ) : attemptStatus?.userPermission === 'edit' ? (
          <ShareQuizModal 
            quizSlug={quiz.slug} 
            quizTitle={quiz.title}
            isAuthor={false}
            visibility={quiz.visibility}
          >
            <Button variant="outline">
              <Share2 className="h-5 w-5 mr-2" />
              {t('share')}
            </Button>
          </ShareQuizModal>
        ) : (
          <Button variant="outline" disabled>
            <Share2 className="h-5 w-5 mr-2" />
            {t('share')}
          </Button>
        )}

        {/* 编辑入口按钮：作者或具备 edit 权限的用户可见 */}
        {(isAuthor || attemptStatus?.userPermission === 'edit') && (
          <Button 
            variant="outline"
            onClick={() => {
              const locale = (params as any)?.locale || 'en';
              const route = isTutor
                ? `/${locale}/tutor/community/quizzes/${quiz.slug}/edit`
                : `/${locale}/community/quizzes/${quiz.slug}/edit`;
              router.push(route);
            }}
          >
            <Pencil className="h-5 w-5 mr-2" />
            {t('edit')}
          </Button>
        )}

        {/* 删除按钮：仅作者可见 */}
        {isAuthor && (
          <>
            <Button 
              variant="outline" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
            >
              <Trash2 className="h-5 w-5 mr-2" />
              {t('delete')}
            </Button>
            
            <DeleteQuizModal 
              quizSlug={quiz.slug} 
              quizTitle={quiz.title}
              isOpen={showDeleteModal}
              onOpenChange={setShowDeleteModal}
              onDeleteSuccess={() => {
                const locale = (params as any)?.locale || 'en';
                const route = isTutor
                  ? `/${locale}/tutor/community/quizzes`
                  : `/${locale}/community/quizzes`;
                router.push(route);
              }}
            />
          </>
        )}
        
        <Button variant="ghost" size="icon">
          <Heart className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

