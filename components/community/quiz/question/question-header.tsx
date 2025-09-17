import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QuestionHeader({ quizSlug }: { quizSlug: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Link
        href={`/community/quizzes/${quizSlug}`}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Quiz
      </Link>
      <span className="text-sm font-medium text-muted-foreground">
        Question
      </span>
    </div>
  );
}
