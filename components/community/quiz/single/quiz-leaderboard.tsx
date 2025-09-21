// C:\Users\jiaxu\Studify\components\community\quiz\single\quiz-leaderboard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Award } from "lucide-react";

interface LeaderItem {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  score: number;
  time_spent_seconds?: number | null;
  completed_at: string;
}

export default function QuizLeaderboard({
  leaderboard,
}: {
  leaderboard: LeaderItem[];
}) {
  // 把秒格式化为 mm:ss 或 H:mm:ss（若 >= 3600）
  const fmtTime = (s?: number | null) => {
    if (s == null) return "—";
    const sec = Math.max(0, Math.floor(s));
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const ss = (sec % 60).toString().padStart(2, "0");
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const medalFor = (rank: number) => {
    if (rank === 1) return "bg-yellow-400 text-black";
    if (rank === 2) return "bg-gray-300 text-black";
    if (rank === 3) return "bg-amber-200 text-black";
    return "bg-transparent";
  };

  return (
    <Card className="bg-transparent p-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>

      <CardContent>
        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No completions yet</p>
            <p className="text-sm">Be the first to complete this quiz!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={`${entry.user_id}-${entry.rank}`}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50"
              >
                <div className="w-10 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${medalFor(entry.rank)}`}>
                    {entry.rank <= 3 ? (
                      <span className="font-bold text-sm">{entry.rank}</span>
                    ) : (
                      <span className="text-sm text-gray-700">{entry.rank}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={entry.avatar_url || ""} />
                    <AvatarFallback>
                      {entry.display_name ? entry.display_name.charAt(0).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.display_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(entry.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-sm font-semibold">{entry.score} pts</div>
                  <div className="text-xs text-gray-500">{fmtTime(entry.time_spent_seconds)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
