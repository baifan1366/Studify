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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
      <div className="flex items-center">
        <Trophy className="w-12 h-12 text-yellow-500" />
        <div className="ml-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Progress Overview
          </h2>
          <p className="text-gray-600">
            You have unlocked{" "}
            <span className="font-bold text-blue-600">{unlockedCount}</span> out
            of <span className="font-bold">{totalCount}</span> achievements.
          </p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
        />
      </div>
    </div>
  );
}
