"use client";
import { useEffect, useState } from "react";
import Header from "@/components/community/achievement/header";
import SummaryCard from "@/components/community/achievement/summary-card";
import Filters from "@/components/community/achievement/filters";
import AchievementCard from "@/components/community/achievement/achievement-card";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import {
  useUserAchievements,
  useUnlockAchievement,
  useRevokeAchievement,
} from "@/hooks/community/use-achievements";
import { Achievement } from "@/interface/community/achievement-interface";

export default function AchievementContent() {
  const [user, setUser] = useState<User | null>(null);

  // Fetch user for header
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 按用户显示解锁状态
  const {
    achievements: userAchievements,
    isLoading,
    isError,
  } = useUserAchievements(user?.id ?? "");

  const { mutate: unlockAchievement } = useUnlockAchievement(user?.id ?? 0);
  const { mutate: revokeAchievement } = useRevokeAchievement(user?.id ?? 0);
  const unlockedCount = userAchievements?.filter((a) => a.unlocked).length ?? 0;
  const totalCount = userAchievements?.length ?? 0;

  const [filter, setFilter] = useState("all");

  const filteredAchievements = (userAchievements ?? []).filter((a) => {
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
          {filteredAchievements.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </div>
    </div>
  );
}
