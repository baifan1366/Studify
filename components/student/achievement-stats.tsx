'use client';

import React, { useMemo } from 'react';
import { useUser } from '@/hooks/profile/use-user';
import { useUserAchievements } from '@/hooks/community/use-achievements';

export default function StudentAchievementStats() {
  const { data: userData } = useUser();
  const userId = userData?.id || '';
  const { achievements, isLoading } = useUserAchievements(userId);
  
  const unlockedCount = useMemo(() => {
    if (!achievements) return 0;
    return achievements.filter(a => a.unlocked).length;
  }, [achievements]);
  
  if (isLoading) {
    return <div className="text-2xl font-bold text-white animate-pulse">...</div>;
  }
  
  return <div className="text-2xl font-bold text-white">{unlockedCount}</div>;
}
