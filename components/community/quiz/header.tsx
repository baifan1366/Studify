"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, PlusCircle, User, Filter, X } from "lucide-react";
import Link from "next/link";
import { useQuizSubjects, useQuizGrades } from "@/hooks/community/use-quiz";
import { useLocale } from "next-intl";
import { getSubjectName, getGradeName } from "@/utils/quiz/translation-utils";

export interface QuizFilters {
  subjectId?: number;
  gradeId?: number;
  difficulty?: number;
}

interface QuizHeaderProps {
  search: string;
  setSearch: (val: string) => void;
  tab: string;
  setTab: (val: string) => void;
  filters: QuizFilters;
  setFilters: (filters: QuizFilters) => void;
}

export default function QuizHeader({
  search,
  setSearch,
  tab,
  setTab,
  filters,
  setFilters,
}: QuizHeaderProps) {
  const locale = useLocale();
  const { data: subjects, isLoading: subjectsLoading } = useQuizSubjects();
  const { data: grades, isLoading: gradesLoading } = useQuizGrades();

  const hasActiveFilters = filters.subjectId || filters.gradeId || filters.difficulty;

  const clearFilters = () => {
    setFilters({});
  };

  const updateFilter = (key: keyof QuizFilters, value: number | undefined) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };
  return (
    <div className="space-y-4 mb-8">
      {/* 第一行：搜索框和操作按钮 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 左侧：搜索框 */}
        <div className="flex items-center gap-2 w-full md:w-1/2">
          <Input
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button size="icon" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* 右侧：Tabs + Create Quiz 按钮 */}
        <div className="flex items-center gap-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex gap-4">
              <TabsTrigger value="popular">
                <Star className="h-4 w-4 mr-2" />
                Popular
              </TabsTrigger>
              <TabsTrigger value="newest">Newest</TabsTrigger>
              <TabsTrigger value="mine">
                <User className="h-4 w-4 mr-2" />
                My Quizzes
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Create Quiz 按钮 */}
          <Link href={`/${locale}/community/quizzes/create`}>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        </div>
      </header>

      {/* 第二行：筛选器 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Subject:</span>
            <Select
              value={filters.subjectId?.toString() || "none"}
              onValueChange={(value) => updateFilter('subjectId', value === "none" ? undefined : Number(value))}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All subjects</SelectItem>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {getSubjectName(subject, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Grade:</span>
            <Select
              value={filters.gradeId?.toString() || "none"}
              onValueChange={(value) => updateFilter('gradeId', value === "none" ? undefined : Number(value))}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="All grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All grades</SelectItem>
                {grades?.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id.toString()}>
                    {getGradeName(grade, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Difficulty:</span>
            <Select
              value={filters.difficulty?.toString() || "none"}
              onValueChange={(value) => updateFilter('difficulty', value === "none" ? undefined : Number(value))}
            >
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All</SelectItem>
                <SelectItem value="1">⭐ Easy</SelectItem>
                <SelectItem value="2">⭐⭐ Fair</SelectItem>
                <SelectItem value="3">⭐⭐⭐ Good</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ Hard</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
