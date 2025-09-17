"use client";
import { useState, useEffect } from "react";
import QuizHeader from "./header";
import QuizList from "./quiz-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useQuizzes } from "@/hooks/community/use-quiz";

function QuizCardSkeleton() {
  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 rounded-md" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex justify-end">
        <Skeleton className="h-9 w-24 rounded-lg" />
      </CardFooter>
    </Card>
  );
}

export default function QuizContent() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("popular");

  const { data: quizzes, isLoading } = useQuizzes();

  const filteredQuizzes =
    quizzes?.filter((quiz) =>
      quiz.title.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Community Quizzes</h1>
      <QuizHeader
        search={search}
        setSearch={setSearch}
        tab={tab}
        setTab={setTab}
      />
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <QuizCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <QuizList quizzes={filteredQuizzes} />
      )}
    </div>
  );
}
