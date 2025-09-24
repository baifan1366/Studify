"use client";
import { useState } from "react";
import QuizHeader, { QuizFilters } from "./header";
import QuizList from "./quiz-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useQuizzes, useSearchQuizzes } from "@/hooks/community/use-quiz";
import { useLocale } from "next-intl";

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
  const [filters, setFilters] = useState<QuizFilters>({});
  const locale = useLocale();

  // When search is empty, use the normal listing; otherwise call FTS search API
  const usingSearch = search.trim().length > 0;
  const hasFilters = filters.subjectId || filters.gradeId || filters.difficulty;

  // For regular listing with filters
  const { data: quizzesList, isLoading: isListLoading } = useQuizzes(
    tab,
    hasFilters ? {
      subject_id: filters.subjectId,
      grade_id: filters.gradeId,
      difficulty: filters.difficulty,
    } : undefined
  );

  // For search with filters
  const { data: searchResults, isLoading: isSearchLoading } = useSearchQuizzes(
    usingSearch
      ? {
          query: search,
          locale: typeof locale === "string" ? locale : "en",
          visibility: "public",
          subject_id: filters.subjectId,
          grade_id: filters.gradeId,
          difficulty: filters.difficulty,
          limit: 24,
          sort: "relevance",
        }
      : { query: "" }
  );

  const dataToShow = usingSearch ? searchResults : quizzesList;
  const loading = usingSearch ? isSearchLoading : isListLoading;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Community Quizzes</h1>
      <QuizHeader
        search={search}
        setSearch={setSearch}
        tab={tab}
        setTab={setTab}
        filters={filters}
        setFilters={setFilters}
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <QuizCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <QuizList quizzes={dataToShow || []} />
      )}
    </div>
  );
}
