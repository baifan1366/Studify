"use client";
import React from "react";
import { useTranslations } from "next-intl";

export default function Header() {
  const t = useTranslations('AchievementHeader');
  
  return (
    <header className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
        {t('title')}
      </h1>
      <p className="text-md text-gray-600 mt-2">
        {t('description')}
      </p>
    </header>
  );
}
