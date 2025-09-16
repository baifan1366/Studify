import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Play, Share2 } from "lucide-react";
import { CommunityQuiz } from "@/interface/community/quiz";
import { Hashtag } from "@/interface/community/post-interface";

export default function QuizHeader({ quiz }: { quiz: CommunityQuiz }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">
        {quiz.title}
      </h1>
      <div className="flex items-center mb-4">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage
            src={quiz.author.avatar_url}
            alt={quiz.author.display_name}
          />
          <AvatarFallback>{quiz.author.display_name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{quiz.author.display_name}</p>
          <p className="text-sm text-muted-foreground">Quiz Creator</p>
        </div>
      </div>
      <p className="text-lg text-muted-foreground mb-4">{quiz.description}</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {quiz.tags.map((tag: string | Hashtag) => (
          <Badge
            key={typeof tag === "string" ? tag : tag.id}
            variant="secondary"
          >
            {typeof tag === "string" ? tag : tag.name}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <Button size="lg">
          <Play className="h-5 w-5 mr-2" />
          Attempt Quiz
        </Button>
        <Button variant="outline">
          <Share2 className="h-5 w-5 mr-2" />
          Share
        </Button>
        <Button variant="ghost" size="icon">
          <Heart className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
