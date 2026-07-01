"use client";
import React from "react";
import { Trophy } from "lucide-react";

interface SummaryCardProps {
  unlockedCount: number;
  totalCount: number;
}

export default function SummaryCard({
  unlockedCount,
  totalCount,
}: SummaryCardProps) {
  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center">
        <Trophy className="w-12 h-12 text-yellow-500" />
        <div className="ml-4">
          <h2 className="text-xl font-semibold text-foreground">
            Progress Overview
          </h2>
          <p className="text-muted-foreground">
            You have unlocked{" "}
            <span className="font-bold text-blue-600">{unlockedCount}</span> out
            of <span className="font-bold">{totalCount}</span> achievements.
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 w-full rounded-full bg-muted">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
