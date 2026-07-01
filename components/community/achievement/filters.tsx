"use client";
import React from "react";
import { useTranslations } from "next-intl";

interface FiltersProps {
  filter: string;
  setFilter: (filter: string) => void;
}

export default function Filters({ filter, setFilter }: FiltersProps) {
  const t = useTranslations('AchievementFilters');
  
  const filterLabels = {
    all: t('all_statuses'),
    unlocked: t('earned'),
    locked: t('not_earned')
  };
  
  return (
    <div className="mb-6 flex border-b border-border">
      {["all", "unlocked", "locked"].map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-4 py-2 text-sm font-medium ${
            filter === f
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {filterLabels[f as keyof typeof filterLabels]}
        </button>
      ))}
    </div>
  );
}
