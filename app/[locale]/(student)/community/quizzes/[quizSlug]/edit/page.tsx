"use client";

import { useParams } from "next/navigation";
import EditQuizForm from "@/components/community/quiz/edit/edit-quiz-form";

export default function EditQuizPage() {
  const { quizSlug } = useParams<{ quizSlug: string }>();

  return <EditQuizForm quizSlug={quizSlug} />;
}
