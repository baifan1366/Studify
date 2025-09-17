import QuizHeader from "./quiz-header";
import QuizComments from "./quiz-comments";
import QuizLeaderboard from "./quiz-leaderboard";
import { Separator } from "@/components/ui/separator";

export default function SingleQuizContent({
  quiz,
  leaderboard,
  comments,
}: any) {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <QuizHeader quiz={quiz} />
          <Separator className="my-8" />
          <QuizComments comments={comments} />
        </div>
        <div className="md:col-span-1">
          <QuizLeaderboard leaderboard={leaderboard} />
        </div>
      </div>
    </div>
  );
}
