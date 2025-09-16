import SingleQuestionContent from "@/components/community/quiz/question/single-question-content";

const mockQuestion = {
  id: "q1",
  text: "What is the derivative of sin(x)?",
  options: [
    { id: "a", text: "cos(x)" },
    { id: "b", text: "-cos(x)" },
    { id: "c", text: "-sin(x)" },
    { id: "d", text: "tan(x)" },
  ],
  correctOptionId: "a",
  explanation: "The derivative of sin(x) with respect to x is cos(x).",
};

const mockComments = [
  {
    id: "1",
    author: { name: "Alice", avatarUrl: "https://i.pravatar.cc/150?u=a" },
    text: "Easy one!",
    likes: 3,
  },
  {
    id: "2",
    author: { name: "Bob", avatarUrl: "https://i.pravatar.cc/150?u=b" },
    text: "Remember chain rule if it's sin(2x)!",
    likes: 5,
  },
];

export default async function Page({
  params,
}: {
  params: Promise<{ quizSlug: string; questionSlug: string }>;
}) {
  const { quizSlug, questionSlug } = await params;
  
  return (
    <SingleQuestionContent
      quizSlug={quizSlug}
      question={mockQuestion}
      comments={mockComments}
    />
  );
}
