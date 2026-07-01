"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { Trophy, Lock } from "lucide-react";
import { Achievement } from "@/hooks/community/use-achievements";

type Props = {
  achievement: Achievement;
};

export default function AchievementCard({ achievement }: Props) {
  const t = useTranslations('AchievementCard');
  const minValue = achievement.rule?.min ?? 0;
  const currentValue = achievement.current_value ?? 0;
  const progress =
    minValue > 0 ? Math.min((currentValue / minValue) * 100, 100) : 0;

  return (
    <div
      key={achievement.id}
      className="rounded-xl border border-border bg-card p-5 text-card-foreground transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`relative w-24 h-24 flex items-center justify-center rounded-full mb-4 ${
            achievement.unlocked ? "bg-yellow-100 dark:bg-yellow-500/15" : "bg-muted"
          }`}
        >
          {achievement.unlocked ? (
            <Trophy className="w-12 h-12 text-gray-400" />
          ) : (
            <>
              <Trophy className="w-12 h-12 text-gray-400" />
              <Lock className="absolute w-6 h-6 text-gray-500" />
            </>
          )}
        </div>

        <h3
          className={`font-bold text-lg ${
            achievement.unlocked ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {achievement.name}
        </h3>

        <p
          className={`text-sm mt-1 ${
            achievement.unlocked ? "text-muted-foreground" : "text-muted-foreground/70"
          }`}
        >
          {achievement.description}
        </p>

        {/* Progress bar */}
        {!achievement.unlocked && (
          <div className="w-full mt-4">
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentValue}/{minValue}
            </p>
          </div>
        )}

        {/* Unlock time */}
        {achievement.unlocked && achievement.unlocked_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('earned_on')} {achievement.unlocked_at}
          </p>
        )}
      </div>
    </div>
  );
}
