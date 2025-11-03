import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import MegaImage from "@/components/attachment/mega-blob-image";

export default function QuestionComments({
  comments,
}: {
  comments: {
    id: string;
    author: { name: string; avatarUrl: string };
    text: string;
    likes: number;
  }[];
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              {c.author.avatarUrl && c.author.avatarUrl.includes('mega.nz') ? (
                <MegaImage
                  megaUrl={c.author.avatarUrl}
                  alt={c.author.name || ''}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <AvatarImage src={c.author.avatarUrl} />
              )}
              <AvatarFallback>{c.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{c.author.name}</p>
              <p className="text-sm text-muted-foreground">{c.text}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              {c.likes}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
