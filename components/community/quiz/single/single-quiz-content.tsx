import QuizHeader from "./quiz-header";
import QuizStats from "./quiz-stats";
import QuizLeaderboard from "./quiz-leaderboard";
import QuizRecentAttemptsModal from "./quiz-recent-attempts";
import { Separator } from "@/components/ui/separator";
import { CommunityQuiz } from "@/interface/community/quiz-interface";

interface SingleQuizContentProps {
  quiz: CommunityQuiz & {
    question_count?: number;
    attempt_count?: number;
    leaderboard?: Array<{
      rank: number;
      user_id: string;
      display_name: string;
      avatar_url?: string;
      score: number;
      time_spent_seconds?: number | null;
      completed_at: string;
    }>;
  };
}

export default function SingleQuizContent({ quiz }: SingleQuizContentProps) {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <QuizHeader quiz={quiz} />
          <Separator className="my-8" />
          <QuizStats quiz={quiz} />
        </div>
        <div className="md:col-span-1 space-y-6">
          <QuizLeaderboard leaderboard={quiz.leaderboard || []} />
          <QuizRecentAttemptsModal quizSlug={quiz.slug} />
        </div>
      </div>
    </div>
  );
}
