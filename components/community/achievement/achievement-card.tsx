"use client";
import React from "react";
import { Trophy, Lock } from "lucide-react";
import { Achievement } from "@/interface/community/achievement-interface";

type Props = {
  achievement: Achievement;
};

export default function AchievementCard({ achievement }: Props) {
  const minValue = achievement.rule?.min ?? 0;
  const currentValue = achievement.current_value ?? 0;
  const progress =
    minValue > 0 ? Math.min((currentValue / minValue) * 100, 100) : 0;

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

        {/* 进度条 */}
        {!achievement.unlocked && (
          <div className="w-full mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentValue}/{minValue}
            </p>
          </div>
        )}

        {/* 解锁时间 */}
        {achievement.unlocked && achievement.unlocked_at && (
          <p className="text-xs text-gray-400 mt-3">
            Unlocked on {achievement.unlocked_at}
          </p>
        )}
      </div>
    </div>
  );
}
