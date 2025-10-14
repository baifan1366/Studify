import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Target, 
  Heart, 
  HelpCircle, 
  Calendar,
  Timer,
  Eye,
  Lock
} from "lucide-react";
import { CommunityQuiz } from "@/interface/community/quiz-interface";

interface QuizStatsProps {
  quiz: CommunityQuiz & {
    question_count?: number;
    attempt_count?: number;
    like_count?: number;
  };
}

export default function QuizStats({ quiz }: QuizStatsProps) {
  const t = useTranslations('QuizStats');
  
  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1: return t("beginner");
      case 2: return t("easy");
      case 3: return t("medium");
      case 4: return t("hard");
      case 5: return t("expert");
      default: return t("unknown");
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-blue-100 text-blue-800";
      case 3: return "bg-yellow-100 text-yellow-800";
      case 4: return "bg-orange-100 text-orange-800";
      case 5: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };


  return (
    <div className="space-y-6">
      {/* Quiz Overview */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("quiz_overview")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {quiz.question_count || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <HelpCircle className="h-4 w-4" />
                {t("questions")}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {quiz.attempt_count || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                {t("attempts")}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {quiz.like_count || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Heart className="h-4 w-4" />
                {t("likes")}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {quiz.max_attempts}
              </div>
              <div className="text-sm text-gray-600">
                {t("max_attempts")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Details */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>{t("quiz_details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={getDifficultyColor(quiz.difficulty)}>
              {getDifficultyLabel(quiz.difficulty)}
            </Badge>
            
            <Badge variant="outline" className="flex items-center gap-1">
              {quiz.visibility === 'private' ? (
                <>
                  <Lock className="h-3 w-3" />
                  {t("private")}
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  {t("public")}
                </>
              )}
            </Badge>
            
          </div>

          {quiz.created_at && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {t("created")} {new Date(quiz.created_at).toLocaleDateString()}
            </div>
          )}

          {/* Duration / Time Limit */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Timer className="h-4 w-4" />
            {typeof quiz.time_limit_minutes === 'number' && quiz.time_limit_minutes > 0 ? (
              <>
                {t("time_limit")}: <span className="font-medium">{quiz.time_limit_minutes} {t("minutes")}</span>
              </>
            ) : (
              <>{t("unlimited")}</>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
