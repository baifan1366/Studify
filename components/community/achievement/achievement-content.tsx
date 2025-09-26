// To be removed
"use client";
import { useState } from "react";
import Header from "@/components/community/achievement/header";
import SummaryCard from "@/components/community/achievement/summary-card";
import Filters from "@/components/community/achievement/filters";
import AchievementCard from "@/components/community/achievement/achievement-card";
import { useUser } from "@/hooks/profile/use-user";
import {
  useUserAchievements,
  useUnlockAchievement,
  useRevokeAchievement,
  Achievement
} from "@/hooks/community/use-achievements";

export default function AchievementContent() {
  const { data: userData } = useUser();
  const userId = userData?.id || '';

  // Get user achievements
  const {
    achievements: userAchievements,
    isLoading,
    isError,
  } = useUserAchievements(userId);

  const { mutate: unlockAchievement } = useUnlockAchievement(userId);
  const { mutate: revokeAchievement } = useRevokeAchievement(userId);
  const unlockedCount = userAchievements?.filter((a) => a.unlocked).length ?? 0;
  const totalCount = userAchievements?.length ?? 0;

  const [filter, setFilter] = useState("all");

  const filteredAchievements = (userAchievements ?? []).filter((a: Achievement) => {
    if (filter === "unlocked") return a.unlocked;
    if (filter === "locked") return !a.unlocked;
    return true;
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load achievements</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="max-w-7xl mx-auto">
        <Header />
        <SummaryCard unlockedCount={unlockedCount} totalCount={totalCount} />
        <Filters filter={filter} setFilter={setFilter} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAchievements.map((ach: Achievement) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </div>
    </div>
  );
}
