"use client";
import React from "react";
import { Trophy, Lock } from "lucide-react";

interface Achievement {
  id: number;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedDate?: string;
}

export default function AchievementCard({
  achievement,
}: {
  achievement: Achievement;
}) {
  return (
    <div
      key={achievement.id}
      className={`bg-white rounded-xl border border-gray-200 p-5 transition-shadow duration-300 hover:shadow-lg`}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`relative w-24 h-24 flex items-center justify-center rounded-full mb-4 ${
            achievement.unlocked ? "bg-yellow-100" : "bg-gray-100"
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
            achievement.unlocked ? "text-gray-900" : "text-gray-500"
          }`}
        >
          {achievement.name}
        </h3>
        <p
          className={`text-sm mt-1 ${
            achievement.unlocked ? "text-gray-600" : "text-gray-400"
          }`}
        >
          {achievement.description}
        </p>
        {achievement.unlocked && achievement.unlockedDate && (
          <p className="text-xs text-gray-400 mt-3">
            Unlocked on {achievement.unlockedDate}
          </p>
        )}
      </div>
    </div>
  );
}
