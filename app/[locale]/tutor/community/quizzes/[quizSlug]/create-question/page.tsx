import QuestionForm from "@/components/community/quiz/create-question/question-form";
import QuizSidebar from "@/components/community/quiz/single/quiz-sidebar";

export default async function CreateQuestionPage({
  params,
}: {
  params: Promise<{ quizSlug: string }>;
}) {
  const { quizSlug } = await params;
  return (
    // Use a flex container for the main layout
    <div className="flex h-full gap-8 px-4 py-8">
      <div className="flex-1 min-w-0 max-w-4xl mx-auto border border-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-8">
          {quizSlug}
        </h1>
        <QuestionForm quizSlug={quizSlug} />
      </div>

      {/* Sidebar with a fixed width, prevented from shrinking */}
      <div className="w-96 flex-shrink-0">
        <QuizSidebar quizSlug={quizSlug} />
      </div>
    </div>
  );
}
