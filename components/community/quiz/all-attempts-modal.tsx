"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Trophy, Clock, Target, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useAllUserQuizAttempts } from "@/hooks/community/use-quiz-sidebar";
import { QuizAttemptDetail } from "@/hooks/community/use-quiz-sidebar";

interface AllAttemptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AttemptStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    not_started: { label: "Not Started", className: "bg-gray-500" },
    in_progress: { label: "In Progress", className: "bg-blue-500" },
    submitted: { label: "Completed", className: "bg-green-500" },
    graded: { label: "Graded", className: "bg-purple-500" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;

  return (
    <Badge className={`${config.className} text-white`}>
      {config.label}
    </Badge>
  );
};

const DifficultyBadge = ({ difficulty }: { difficulty: number }) => {
  const levels = ["Beginner", "Easy", "Medium", "Hard", "Expert"];
  const colors = ["bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
  
  return (
    <Badge className={`${colors[difficulty - 1]} text-white`}>
      {levels[difficulty - 1]}
    </Badge>
  );
};

const AttemptCard = ({ attempt }: { attempt: QuizAttemptDetail }) => {
  const scorePercentage = (attempt.total_questions && attempt.total_questions > 0)
    ? Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100)
    : 0;

  return (
    <div className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link href={`/community/quizzes/${attempt.quiz.slug}`}>
            <h4 className="font-medium text-white hover:text-blue-300 cursor-pointer line-clamp-1">
              {attempt.quiz.title}
            </h4>
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <AttemptStatusBadge status={attempt.status} />
            <DifficultyBadge difficulty={attempt.quiz.difficulty} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(attempt.created_at), "MMM d, yyyy")}</span>
        </div>
        
        {(attempt.status === 'submitted' || attempt.status === 'graded') && (
          <>
            <div className="flex items-center gap-2 text-gray-300">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>{attempt.score} points</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Target className="w-4 h-4" />
              <span>{attempt.correct_answers || 0}/{attempt.total_questions || 0} correct</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="flex items-center gap-1">
                {scorePercentage >= 80 ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={scorePercentage >= 80 ? "text-green-400" : "text-red-400"}>
                  {scorePercentage}%
                </span>
              </div>
            </div>
          </>
        )}
        
        {attempt.status === 'in_progress' && (
          <div className="flex items-center gap-2 text-blue-400">
            <Clock className="w-4 h-4" />
            <span>Continue Quiz</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function AllAttemptsModal({ isOpen, onClose }: AllAttemptsModalProps) {
  const { data: attempts, isLoading } = useAllUserQuizAttempts();

  // Group attempts by status
  const groupedAttempts = React.useMemo(() => {
    if (!attempts) return { in_progress: [], submitted: [], graded: [] };
    
    return attempts.reduce((acc, attempt) => {
      const status = attempt.status === 'not_started' ? 'in_progress' : attempt.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(attempt);
      return acc;
    }, {} as Record<string, QuizAttemptDetail[]>);
  }, [attempts]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            All Quiz Attempts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full bg-white/10" />
              ))}
            </div>
          ) : attempts && attempts.length > 0 ? (
            <div className="space-y-6">
              {groupedAttempts.in_progress?.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">In Progress</h3>
                  <div className="space-y-3">
                    {groupedAttempts.in_progress.map((attempt) => (
                      <AttemptCard key={attempt.id} attempt={attempt} />
                    ))}
                  </div>
                </div>
              )}

              {groupedAttempts.submitted?.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Completed</h3>
                  <div className="space-y-3">
                    {groupedAttempts.submitted.map((attempt) => (
                      <AttemptCard key={attempt.id} attempt={attempt} />
                    ))}
                  </div>
                </div>
              )}

              {groupedAttempts.graded?.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Graded</h3>
                  <div className="space-y-3">
                    {groupedAttempts.graded.map((attempt) => (
                      <AttemptCard key={attempt.id} attempt={attempt} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No quiz attempts yet</p>
              <Link href="/community/quizzes">
                <p className="text-blue-400 hover:text-blue-300 mt-2 cursor-pointer">
                  Browse quizzes to get started
                </p>
              </Link>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
