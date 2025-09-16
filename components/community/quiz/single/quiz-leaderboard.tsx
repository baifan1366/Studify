import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  avatarUrl: string;
}

export default function QuizLeaderboard({
  leaderboard,
}: {
  leaderboard: LeaderboardEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg w-6 text-center">
                  {entry.rank}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={entry.avatarUrl} />
                  <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{entry.name}</p>
              </div>
              <p className="font-semibold text-lg">{entry.score}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
