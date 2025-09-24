"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, PlusCircle, User } from "lucide-react";
import Link from "next/link";

interface QuizHeaderProps {
  search: string;
  setSearch: (val: string) => void;
  tab: string;
  setTab: (val: string) => void;
}

export default function QuizHeader({
  search,
  setSearch,
  tab,
  setTab,
}: QuizHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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
        <Link href="/en/community/quizzes/create">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Quiz
          </Button>
        </Link>
      </div>
    </header>
  );
}
