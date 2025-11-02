"use client";

import { useQuizScore } from "@/hooks/community/use-quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target } from "lucide-react";
import { useTranslations } from "next-intl";

interface QuizScoreDisplayProps {
  attemptId: number | null;
  totalQuestions?: number;
  showDetails?: boolean;
}

export default function QuizScoreDisplay({
  attemptId,
  totalQuestions = 0,
  showDetails = true
}: QuizScoreDisplayProps) {
  const t = useTranslations("QuizScoreDisplay");
  const { data: scoreData, isLoading, error } = useQuizScore(attemptId);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">{t("calculating_score")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !scoreData) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <Target className="h-5 w-5 mr-2" />
            <span>{t("failed_to_get_score")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = scoreData.score;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  // 根据分数确定等级和颜色
  const getScoreLevel = (score: number, total: number) => {
    if (total === 0) return { level: "unknown", color: "gray" };
    const percent = (score / total) * 100;
    if (percent >= 90) return { level: "excellent", color: "green" };
    if (percent >= 80) return { level: "good", color: "blue" };
    if (percent >= 70) return { level: "medium", color: "yellow" };
    if (percent >= 60) return { level: "pass", color: "orange" };
    return { level: "fail", color: "red" };
  };

  const { level, color } = getScoreLevel(score, totalQuestions);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t("quiz_score")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 主要分数显示 */}
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {score}
            </div>
            <div className="text-sm text-gray-600">
              {t("correct_questions_count")}
            </div>
          </div>

          {/* 详细信息 */}
          {showDetails && totalQuestions > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t("accuracy")}</span>
                <span className="font-medium">{percentage}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t("correct_total")}</span>
                <span className="font-medium">{score}/{totalQuestions}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t("grade")}</span>
                <Badge
                  variant="outline"
                  className={`
                    ${color === 'green' ? 'border-green-500 text-green-700 bg-green-50' : ''}
                    ${color === 'blue' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}
                    ${color === 'yellow' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : ''}
                    ${color === 'orange' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''}
                    ${color === 'red' ? 'border-red-500 text-red-700 bg-red-50' : ''}
                    ${color === 'gray' ? 'border-gray-500 text-gray-700 bg-gray-50' : ''}
                  `}
                >
                  {level}
                </Badge>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${color === 'green' ? 'bg-green-500' :
                    color === 'blue' ? 'bg-blue-500' :
                      color === 'yellow' ? 'bg-yellow-500' :
                        color === 'orange' ? 'bg-orange-500' :
                          color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                    }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
