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
import { Play } from "lucide-react";
import type { CommunityQuiz } from "@/interface/community/quiz-interface";

interface QuizCardProps {
  quiz: CommunityQuiz;
}

export default function QuizCard({ quiz }: QuizCardProps) {
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
      <CardFooter className="mt-auto px-4 pb-4 flex justify-end">
        <Link href={`/community/quizzes/${quiz.slug}/attempt`}>
          <Button size="sm" className="rounded-lg">
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
