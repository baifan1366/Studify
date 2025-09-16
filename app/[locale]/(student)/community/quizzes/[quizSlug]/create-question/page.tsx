import QuestionForm from "@/components/community/quiz/create-question/question-form";
import QuizSidebar from "@/components/community/quiz/single/quiz-sidebar";

export default function CreateQuestionPage({
  params,
}: {
  params: { quizSlug: string };
}) {
  return (
    // Use a flex container for the main layout
    <div className="flex h-full gap-8 px-4 py-8">
      {/* Main content area, takes up the remaining space and centers its content */}
      <div className="flex-1 min-w-0 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Add Question to Quiz: {params.quizSlug}
        </h1>
        <QuestionForm quizSlug={params.quizSlug} />
      </div>

      {/* Sidebar with a fixed width, prevented from shrinking */}
      <div className="w-96 flex-shrink-0">
        <QuizSidebar quizSlug={params.quizSlug} />
      </div>
    </div>
  );
}
