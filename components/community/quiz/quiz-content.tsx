"use client";

import { useState } from "react";
import QuizHeader from "./header";
import QuizList from "./quiz-list";

const mockQuizzes = [
  {
    id: 1,
    title: "JavaScript Basics",
    description: "Test your knowledge of variables, loops, and functions.",
    difficulty: "Easy",
    tags: ["JavaScript", "Programming", "Web"],
  },
  {
    id: 2,
    title: "React Advanced",
    description: "Hooks, Context, and advanced patterns in React.",
    difficulty: "Hard",
    tags: ["React", "Frontend"],
  },
  {
    id: 3,
    title: "Database Design",
    description: "Normalization, indexes, and relational concepts.",
    difficulty: "Medium",
    tags: ["Database", "SQL", "Backend"],
  },
];

export default function QuizContent() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("popular");

  const filteredQuizzes = mockQuizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Community Quizzes</h1>
      <QuizHeader
        search={search}
        setSearch={setSearch}
        tab={tab}
        setTab={setTab}
      />
      <QuizList quizzes={filteredQuizzes} />
    </div>
  );
}
