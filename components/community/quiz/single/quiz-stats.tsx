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
  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1: return "Beginner";
      case 2: return "Easy";
      case 3: return "Medium";
      case 4: return "Hard";
      case 5: return "Expert";
      default: return "Unknown";
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

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'practice': return 'Practice Mode';
      case 'strict': return 'Strict Mode';
      default: return mode;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quiz Overview */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quiz Overview
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
                Questions
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {quiz.attempt_count || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                Attempts
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {quiz.like_count || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Heart className="h-4 w-4" />
                Likes
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {quiz.max_attempts}
              </div>
              <div className="text-sm text-gray-600">
                Max Attempts
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Details */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
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
                  Private
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  Public
                </>
              )}
            </Badge>
            
            <Badge variant="secondary">
              {getModeLabel(quiz.quiz_mode)}
            </Badge>
          </div>

          {quiz.created_at && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              Created {new Date(quiz.created_at).toLocaleDateString()}
            </div>
          )}

          {/* Duration / Time Limit */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Timer className="h-4 w-4" />
            {typeof quiz.time_limit_minutes === 'number' && quiz.time_limit_minutes > 0 ? (
              <>
                Duration: <span className="font-medium">{quiz.time_limit_minutes} min</span>
              </>
            ) : (
              <>
                No time limit
              </>
            )}
          </div>

          {quiz.tags && quiz.tags.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {quiz.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {typeof tag === 'string' ? tag : tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
