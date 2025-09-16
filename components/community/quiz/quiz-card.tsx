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

interface QuizCardProps {
  quiz: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    tags: string[];
  };
}

export default function QuizCard({ quiz }: QuizCardProps) {
  return (
    <Card className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 relative">
      <div className="absolute top-3 right-3">
        <Badge className="bg-red-500 text-white">{quiz.difficulty}</Badge>
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {quiz.tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline">
              {tag}
            </Badge>
          ))}
          {quiz.tags.length > 3 && (
            <Badge variant="outline">+{quiz.tags.length - 3}</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto px-4 pb-4 flex justify-end">
        <Button size="sm" className="rounded-lg">
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
      </CardFooter>
    </Card>
  );
}
