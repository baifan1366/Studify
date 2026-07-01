"use client";
import React from "react";
import { useTranslations } from "next-intl";

export default function Header() {
  const t = useTranslations('AchievementHeader');
  
  return (
    <header className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground">
        {t('title')}
      </h1>
      <p className="text-md mt-2 text-muted-foreground">
        {t('description')}
      </p>
    </header>
  );
}
