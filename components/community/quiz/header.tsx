"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star } from "lucide-react";

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
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex gap-4">
          <TabsTrigger value="popular">
            <Star className="h-4 w-4 mr-2" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="newest">Newest</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  );
}
