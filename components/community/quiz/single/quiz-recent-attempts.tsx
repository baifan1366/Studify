"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Trophy, Target, TrendingUp, Eye, Calendar } from "lucide-react";
import MegaImage from "@/components/attachment/mega-blob-image";

type TranslateFn = ReturnType<typeof useTranslations>;

interface AttemptData {
  id: number;
  score: number;
  time_spent_seconds: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  attemptNumber?: number;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface Statistics {
  totalAttempts: number;
  uniqueUsers: number;
  avgScore: number;
  maxScore: number;
  avgTimeSpent: number;
  successRate: number;
}

interface QuizInfo {
  title: string;
  maxAttempts?: number;
  userAttemptCount?: number;
}

interface RecentAttemptsData {
  role: "admin" | "user";
  attempts: AttemptData[];
  statistics?: Statistics;
  quiz: QuizInfo;
}

interface QuizRecentAttemptsModalProps {
  quizSlug: string;
  trigger?: React.ReactNode;
}

// Fetch recent attempts data
async function fetchRecentAttempts(quizSlug: string): Promise<RecentAttemptsData> {
  const res = await fetch(`/api/community/quizzes/${quizSlug}/attempts/recent`);
  if (!res.ok) throw new Error("Failed to fetch attempts");
  return res.json();
}

// Format time duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Get status badge variant
function getStatusBadge(status: string, t: TranslateFn) {
  switch (status) {
    case "submitted":
      return <Badge variant="default">{t("status_submitted")}</Badge>;
    case "graded":
      return <Badge variant="secondary">{t("status_graded")}</Badge>;
    case "expired":
      return <Badge variant="destructive">{t("status_expired")}</Badge>;
    default:
      return <Badge variant="outline">{t("status_default", { status })}</Badge>;
  }
}

// Statistics Cards Component
function StatisticsCards({ stats }: { stats: Statistics }) {
  const t = useTranslations("QuizRecentAttempts");
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("stat_total_attempts")}</p>
              <p className="text-2xl font-bold">{stats.totalAttempts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("stat_unique_users")}</p>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("stat_success_rate")}</p>
              <p className="text-2xl font-bold">{stats.successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("stat_avg_score")}</p>
              <p className="text-2xl font-bold">{stats.avgScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("stat_max_score")}</p>
              <p className="text-2xl font-bold">{stats.maxScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("stat_avg_time")}</p>
              <p className="text-2xl font-bold">{formatDuration(stats.avgTimeSpent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Attempts List Component
function AttemptsList({ attempts, role }: { attempts: AttemptData[]; role: "admin" | "user" }) {
  const t = useTranslations("QuizRecentAttempts");
  if (attempts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("no_attempts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt) => (
        <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {role === "admin" && attempt.profiles ? (
              // Admin view: Show user info
              <>
                <Avatar className="h-8 w-8">
                  {attempt.profiles.avatar_url && attempt.profiles.avatar_url.includes('mega.nz') ? (
                    <MegaImage
                      megaUrl={attempt.profiles.avatar_url}
                      alt={attempt.profiles.display_name || ''}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <AvatarImage src={attempt.profiles.avatar_url} />
                  )}
                  <AvatarFallback>
                    {attempt.profiles.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{attempt.profiles.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("score_label")}: {attempt.score} • {formatDuration(attempt.time_spent_seconds || 0)}
                  </p>
                </div>
              </>
            ) : (
              // User view: Show attempt number
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">#{attempt.attemptNumber}</span>
                </div>
                <div>
                  <p className="font-medium">{t("attempt_label", { number: attempt.attemptNumber ?? "?" })}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("score_label")}: {attempt.score} • {formatDuration(attempt.time_spent_seconds || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {getStatusBadge(attempt.status, t)}
            <div className="text-right">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(attempt.created_at)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuizRecentAttemptsModal({ quizSlug, trigger }: QuizRecentAttemptsModalProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("QuizRecentAttempts");

  const { data, isLoading, error } = useQuery<RecentAttemptsData>({
    queryKey: ["recentAttempts", quizSlug],
    queryFn: () => fetchRecentAttempts(quizSlug),
    enabled: trigger ? open : true,
  });

  if (!trigger) {
    const hasAttempts = (data?.attempts?.length ?? 0) > 0;
    const visibleAttempts = hasAttempts ? data!.attempts!.slice(0, 3) : [];

    return (
      <Card className="bg-transparent p-2 border border-white/10 text-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("recent_attempts_title", { title: data?.quiz?.title ?? "" })}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading recent attempts...</p>
          ) : error ? (
            <p className="text-sm text-red-400">Failed to load attempts.</p>
          ) : hasAttempts ? (
            <>
              {visibleAttempts.map((attempt, i) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 border border-white/10 rounded-lg hover:bg-muted/50 transition"
                >
                  <div>
                    <p className="font-medium">Attempt #{attempt.attemptNumber ?? i + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("score_label")}: {attempt.score} • {formatDuration(attempt.time_spent_seconds || 0)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(attempt.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}

              {data && data.attempts && data.attempts.length > 3 && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 flex items-center gap-2 cursor-pointer">
                      <Eye className="h-4 w-4" />
                      {t("view_more_attempts")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {t("recent_attempts_title", { title: data?.quiz?.title ?? "" })}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto">
                      <AttemptsList attempts={data.attempts} role={data.role} />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mb-3 opacity-50" />
              <p>{t("no_attempts")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ✅ 有 trigger 时 — 原样保留 modal 模式
  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-4 w-4 mr-2" />
      {t("view_attempts")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("recent_attempts_title", { title: data?.quiz.title ?? "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {error && (
            <div className="text-center py-8 text-red-500">
              <p>{t("load_error")}</p>
            </div>
          )}
          {data && (
            <>
              {data.role === "admin" ? (
                <Tabs defaultValue="attempts" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="attempts">
                      {t("all_attempts_tab", { count: data.attempts.length })}
                    </TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                  </TabsList>
                  <TabsContent value="attempts" className="space-y-4">
                    <AttemptsList attempts={data.attempts} role="admin" />
                  </TabsContent>
                  <TabsContent value="statistics" className="space-y-4">
                    {data.statistics && <StatisticsCards stats={data.statistics} />}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("your_attempts")}</h3>
                    {data.quiz.maxAttempts && (
                      <Badge variant="outline">
                        {t("attempts_used", {
                          used: data.quiz.userAttemptCount ?? 0,
                          max: data.quiz.maxAttempts ?? 0,
                        })}
                      </Badge>
                    )}
                  </div>
                  <AttemptsList attempts={data.attempts} role="user" />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuizRecentAttemptsModal;
