import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";

interface RecentAttempt {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  completed_at: string;
}

export default function QuizLeaderboard({
  recentAttempts,
}: {
  recentAttempts: RecentAttempt[];
}) {
  return (
    <Card className="bg-transparent p-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Recent Completions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentAttempts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No completions yet</p>
            <p className="text-sm">Be the first to complete this quiz!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentAttempts.map((attempt, index) => (
              <div key={`${attempt.user_id}-${attempt.completed_at}`} className="flex items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={attempt.avatar_url || ''} />
                    <AvatarFallback>
                      {attempt.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{attempt.display_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
