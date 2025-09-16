import QuizCard from "./quiz-card";

interface QuizListProps {
  quizzes: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    tags: string[];
  }[];
}

export default function QuizList({ quizzes }: QuizListProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Available Quizzes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>
    </section>
  );
}
