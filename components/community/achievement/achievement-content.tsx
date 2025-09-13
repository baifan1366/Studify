"use client";
import React from "react";
import Header from "@/components/community/achievement/header";
import SummaryCard from "@/components/community/achievement/summary-card";
import Filters from "@/components/community/achievement/filters";
import AchievementCard from "@/components/community/achievement/achievement-card";

// --- Mock Data: In a real app, this would come from an API ---
const achievements = [
  {
    id: 1,
    name: "First Post",
    description: "Publish your first post in the community.",
    unlocked: true,
    unlockedDate: "2023-10-01",
  },
  {
    id: 2,
    name: "Community Helper",
    description: 'Your reply was marked as the "best answer".',
    unlocked: true,
    unlockedDate: "2023-10-15",
  },
  {
    id: 3,
    name: "Well-Received",
    description: "Receive 10 upvotes on a single post.",
    unlocked: true,
    unlockedDate: "2023-11-05",
  },
  {
    id: 4,
    name: "Topic Starter",
    description: "Start a discussion in 3 different study groups.",
    unlocked: false,
  },
  {
    id: 5,
    name: "Daily Visitor",
    description: "Visit the community for 7 consecutive days.",
    unlocked: false,
  },
  {
    id: 6,
    name: "Influencer",
    description: "A post you made received over 50 replies.",
    unlocked: false,
  },
  {
    id: 7,
    name: "Prolific Writer",
    description: "Publish 25 posts in total.",
    unlocked: true,
    unlockedDate: "2023-12-10",
  },
  {
    id: 8,
    name: "Problem Solver",
    description: 'Have 10 of your replies marked as "best answer".',
    unlocked: false,
  },
  {
    id: 9,
    name: "Legendary Contributor",
    description: "Receive 1000 upvotes in total.",
    unlocked: false,
  },
];

export default function AchievementContent() {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  const [filter, setFilter] = React.useState("all");

  const filteredAchievements = achievements.filter((a) => {
    if (filter === "unlocked") return a.unlocked;
    if (filter === "locked") return !a.unlocked;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="max-w-7xl mx-auto">
        <Header />
        <SummaryCard unlockedCount={unlockedCount} totalCount={totalCount} />
        <Filters filter={filter} setFilter={setFilter} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAchievements.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </div>
    </div>
  );
}
