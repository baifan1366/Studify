import QuizForm from "@/components/community/quiz/create/quiz-form";

export default function CreateQuizPage() {
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Create a New Quiz</h1>
      <QuizForm />
    </div>
  );
}
