"use client";

import { useParams } from "next/navigation";
import EditQuizForm from "@/components/community/quiz/edit/edit-quiz-form";

// Note: This is a client component, so metadata should be handled by the parent layout
// or converted to a server component if metadata is needed

export default function EditQuizPage() {
  const { quizSlug } = useParams<{ quizSlug: string }>();

  return <EditQuizForm quizSlug={quizSlug} />;
}
