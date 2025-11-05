import { useTranslations } from "next-intl";
import QuizCard from "./quiz-card";
import type { CommunityQuiz } from "@/interface/community/quiz-interface";

interface QuizListProps {
  quizzes: (CommunityQuiz & { question_count?: number })[];
  showWarning?: boolean; // For "My Quizzes" tab
}

export default function QuizList({ quizzes, showWarning = false }: QuizListProps) {
  const t = useTranslations('QuizList');
  // Frontend safety filter: For community views (when showWarning is false),
  // filter out quizzes that have no questions to prevent showing invalid quizzes
  const filteredQuizzes = showWarning 
    ? quizzes // Show all quizzes in "My Quizzes" tab (with warnings)
    : quizzes.filter((quiz) => {
        // For community views, only show quizzes that have at least 1 question
        // This is a frontend safety filter in addition to backend filtering
        
        // If question_count is explicitly provided and is 0, filter it out
        if (quiz.question_count !== undefined) {
          return quiz.question_count > 0;
        }
        
        // If no question_count info, assume it's valid (backend should have filtered)
        // This maintains compatibility with existing API responses
        return true;
      });

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('available_quizzes')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} showWarning={showWarning} />
        ))}
      </div>
    </section>
  );
}
