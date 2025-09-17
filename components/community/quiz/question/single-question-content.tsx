import QuestionHeader from "./question-header";
import QuestionBody from "./question-body";
import QuestionOptions from "./question-options";
import QuestionFooter from "./question-footer";
import QuestionComments from "./question-comments";

export default function SingleQuestionContent({
  quizSlug,
  question,
  comments,
}: {
  quizSlug: string;
  question: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
    explanation: string;
  };
  comments: {
    id: string;
    author: { name: string; avatarUrl: string };
    text: string;
    likes: number;
  }[];
}) {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <QuestionHeader quizSlug={quizSlug} />
      <QuestionBody text={question.text} />
      <QuestionOptions
        options={question.options}
        correctOptionId={question.correctOptionId}
      />
      <QuestionFooter explanation={question.explanation} />
      <QuestionComments comments={comments} />
    </div>
  );
}
