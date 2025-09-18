import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Play, Share2, Lock, Eye, CheckCircle } from "lucide-react";
import { CommunityQuiz } from "@/interface/community/quiz-interface";
import { Hashtag } from "@/interface/community/post-interface";
import ShareQuizModal from "@/components/community/quiz/share-quiz-modal";
import { useUser } from "@/hooks/profile/use-user";
import { useUserAttemptStatus } from "@/hooks/community/use-quiz";
import { useRouter } from "next/navigation";

export default function QuizHeader({ quiz }: { quiz: CommunityQuiz }) {
  const { data: currentUser } = useUser();
  const { data: attemptStatus, isLoading: statusLoading } = useUserAttemptStatus(quiz.slug);
  const router = useRouter();
  const isAuthor = currentUser?.id === quiz.author_id;

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
            {isAuthor && <span className="text-blue-600 ml-2">(You)</span>}
          </p>
          <p className="text-sm text-muted-foreground">Quiz Creator</p>
        </div>
      </div>
      <p className="text-lg text-muted-foreground mb-4">{quiz.description}</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {quiz.tags?.map((tag: string | Hashtag) => (
          <Badge
            key={typeof tag === "string" ? tag : tag.id}
            variant="secondary"
          >
            {typeof tag === "string" ? tag : tag.name}
          </Badge>
        ))}
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
            onClick={() => router.push(`/community/quizzes/${quiz.slug}/attempt`)}
          >
            <Play className="h-5 w-5 mr-2" />
            {isAuthor ? "Preview Quiz" : "Attempt Quiz"}
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
          >
            <Button variant="outline">
              <Share2 className="h-5 w-5 mr-2" />
              Share
            </Button>
          </ShareQuizModal>
        ) : attemptStatus?.userPermission === 'edit' ? (
          <ShareQuizModal 
            quizSlug={quiz.slug} 
            quizTitle={quiz.title}
            isAuthor={false}
          >
            <Button variant="outline">
              <Share2 className="h-5 w-5 mr-2" />
              Share
            </Button>
          </ShareQuizModal>
        ) : (
          <Button variant="outline" disabled>
            <Share2 className="h-5 w-5 mr-2" />
            Share
          </Button>
        )}
        
        <Button variant="ghost" size="icon">
          <Heart className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
