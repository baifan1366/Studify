"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import QuizHeader, { QuizFilters } from "./header";
import QuizList from "./quiz-list";
import QuizzesSidebar from "./quizzes-sidebar";
import { useQuizzes, useSearchQuizzes } from "@/hooks/community/use-quiz";
import { QuizCardSkeleton } from "@/components/community/skeletons";

export default function QuizContent() {
  const t = useTranslations("QuizContent");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("popular");
  const [filters, setFilters] = useState<QuizFilters>({});
  const locale = useLocale();

  const usingSearch = search.trim().length > 0;
  const hasFilters = filters.subjectId || filters.gradeId || filters.difficulty;

  const { data: quizzesList, isLoading: isListLoading } = useQuizzes(
    tab,
    hasFilters
      ? {
          subject_id: filters.subjectId,
          grade_id: filters.gradeId,
          difficulty: filters.difficulty,
        }
      : undefined
  );

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
    <div className="flex h-full bg-background">
      {/* Main content section */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto max-w-5xl mx-auto">
        <div className="max-w-full">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t("title")}</h1>
          <QuizHeader
            search={search}
            setSearch={setSearch}
            tab={tab}
            setTab={setTab}
            filters={filters}
            setFilters={setFilters}
          />

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <QuizCardSkeleton key={i} />
              ))}
            </div>
          ) : dataToShow && dataToShow.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {usingSearch
                  ? t("no_search_results")
                  : t("no_quizzes_available")}
              </p>
            </div>
          ) : (
            <QuizList quizzes={dataToShow || []} showWarning={tab === "mine"} />
          )}
        </div>
      </div>

      {/* Sidebar section */}
      <div className="w-96 flex-shrink-0 p-6 border-l border-border overflow-y-auto overflow-x-hidden bg-background">
        <QuizzesSidebar />
      </div>
    </div>
  );
}
