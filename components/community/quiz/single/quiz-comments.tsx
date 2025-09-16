import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ThumbsUp } from "lucide-react";

interface Comment {
  id: string;
  author: { name: string; avatarUrl: string };
  text: string;
  likes: number;
}

export default function QuizComments({ comments }: { comments: Comment[] }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Comments ({comments.length})</h2>
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-4">
            <Avatar>
              <AvatarImage src={comment.author.avatarUrl} />
              <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{comment.author.name}</p>
              <p className="text-muted-foreground">{comment.text}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ThumbsUp className="h-4 w-4" /> {comment.likes}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>YOU</AvatarFallback>
        </Avatar>
        <div className="relative flex-1">
          <Textarea placeholder="Add a comment..." className="pr-16" />
          <Button size="icon" className="absolute top-2 right-2">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
