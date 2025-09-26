"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttemptItemSkeleton, StatsCardSkeleton } from "@/components/community/skeletons";
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { 
  FileText, 
  Clock, 
  Trophy, 
  Lock, 
  Globe, 
  ArrowRight, 
  Share2,
  Calendar,
  Target,
  CheckCircle,
  BarChart3,
  User,
  Eye,
  Edit
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import {
  useUserQuizAttempts,
  useSharedPrivateQuizzes,
  useQuizAttemptStats,
  SharedPrivateQuiz
} from "@/hooks/community/use-quiz-sidebar";
import AllAttemptsModal from "./all-attempts-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AttemptCard = ({
  attempt,
}: {
  attempt: any;
}) => {
  const statusConfig = {
    not_started: { label: "Not Started", color: "text-gray-400" },
    in_progress: { label: "In Progress", color: "text-blue-400" },
    submitted: { label: "Completed", color: "text-green-400" },
    graded: { label: "Graded", color: "text-purple-400" },
  };

  const status = statusConfig[attempt.status as keyof typeof statusConfig] || statusConfig.not_started;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {attempt.status === 'in_progress' ? (
            <Clock className="w-4 h-4 text-blue-400" />
          ) : attempt.status === 'submitted' || attempt.status === 'graded' ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <FileText className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/community/quizzes/${attempt.quiz.slug}`}>
            <h4 className="font-medium text-white text-sm truncate hover:text-blue-300 cursor-pointer">
              {attempt.quiz.title}
            </h4>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className={status.color}>{status.label}</span>
            {(attempt.status === 'submitted' || attempt.status === 'graded') && attempt.score > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-yellow-400">{attempt.score} pts</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SharedPrivateQuizCard = ({
  quiz,
}: {
  quiz: SharedPrivateQuiz;
}) => {
  const permissionConfig = {
    view: { icon: Eye, label: "View Only", color: "text-blue-400" },
    attempt: { icon: Target, label: "Can Attempt", color: "text-green-400" },
    edit: { icon: Edit, label: "Can Edit", color: "text-purple-400" },
  };

  const permission = permissionConfig[quiz.permission_type as keyof typeof permissionConfig];
  const Icon = permission?.icon || Eye;

  // Format expiry date
  const getExpiryText = () => {
    if (!quiz.expires_at) return "No expiry";
    const expiryDate = new Date(quiz.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return "Expired";
    if (daysLeft === 0) return "Expires today";
    if (daysLeft === 1) return "Expires tomorrow";
    if (daysLeft <= 7) return `Expires in ${daysLeft} days`;
    return format(expiryDate, "MMM d, yyyy");
  };

  const expiryText = getExpiryText();
  const isExpiringSoon = quiz.expires_at && 
    new Date(quiz.expires_at).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
      {/* Header with title and permission badge */}
      <div className="flex items-start justify-between mb-2">
        <Link href={`/community/quizzes/${quiz.quiz_slug}`} className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate hover:text-blue-300 cursor-pointer">
            {quiz.title}
          </h4>
        </Link>
        <Badge className={`${permission.color} bg-opacity-20 border-0 text-xs ml-2`}>
          <Icon className="w-3 h-3 mr-1" />
          {permission.label}
        </Badge>
      </div>

      {/* Shared by info */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={quiz.granted_by_avatar || undefined} />
          <AvatarFallback className="text-xs bg-white/10">
            {quiz.granted_by_name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-gray-400">
          Shared by <span className="text-gray-300">{quiz.granted_by_name}</span>
        </span>
      </div>

      {/* Footer with expiry and lock icon */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-yellow-400" />
          <span className="text-gray-400">Private Quiz</span>
        </div>
        <span className={`${isExpiringSoon ? 'text-orange-400' : 'text-gray-400'}`}>
          {expiryText}
        </span>
      </div>

      {/* Tags if available */}
      {quiz.tags && quiz.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {quiz.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs border-white/20 text-gray-300">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default function QuizzesSidebar() {
  const { data: attempts, isLoading: loadingAttempts } = useUserQuizAttempts(5);
  const { data: sharedData, isLoading: loadingShared } = useSharedPrivateQuizzes();
  const { data: stats, isLoading: loadingStats } = useQuizAttemptStats();
  const [showAllAttemptsModal, setShowAllAttemptsModal] = useState(false);
  
  const sharedQuizzes = sharedData?.quizzes || [];

  return (
    <>
      <div className="w-80 space-y-6">
        {/* My Attempts Section */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">My Attempts</CardTitle>
              <Badge variant="outline" className="border-blue-400 text-blue-400">
                {stats?.total_attempts || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingAttempts ? (
              Array.from({ length: 3 }).map((_, i) => (
                <AttemptItemSkeleton key={i} />
              ))
            ) : attempts && attempts.length > 0 ? (
              <>
                {attempts.slice(0, 5).map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))}
                {(stats?.total_attempts ?? 0) > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-blue-400 hover:bg-blue-400/10"
                    onClick={() => setShowAllAttemptsModal(true)}
                  >
                    Show More
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-3">
                  No quiz attempts yet
                </p>
                <Link href="/community/quizzes">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <FileText className="w-4 h-4 mr-1" />
                    Browse Quizzes
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Private Quizzes Shared with Me Section */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">Shared with Me</CardTitle>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Private</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingShared ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5">
                  <AttemptItemSkeleton />
                </div>
              ))
            ) : sharedQuizzes && sharedQuizzes.length > 0 ? (
              sharedQuizzes.slice(0, 5).map((quiz) => (
                <SharedPrivateQuizCard key={quiz.quiz_id} quiz={quiz} />
              ))
            ) : (
              <div className="text-center py-6">
                <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">
                  No private quizzes shared with you
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Private quizzes require explicit permission
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiz Stats */}
        {stats && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">My Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Total Attempts
                  </span>
                  <Badge variant="outline" className="border-blue-400 text-blue-400">
                    {stats.total_attempts}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                  </span>
                  <Badge variant="outline" className="border-green-400 text-green-400">
                    {stats.completed_attempts}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    In Progress
                  </span>
                  <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                    {stats.in_progress_attempts}
                  </Badge>
                </div>
                {stats.completed_attempts > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Average Score
                      </span>
                      <Badge variant="outline" className="border-purple-400 text-purple-400">
                        {stats.average_score}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Best Score
                      </span>
                      <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                        {stats.best_score}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All Attempts Modal */}
      <AllAttemptsModal 
        isOpen={showAllAttemptsModal}
        onClose={() => setShowAllAttemptsModal(false)}
      />
    </>
  );
}
