'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface ShowHeroButtonProps {
  onShowHero?: () => void;
}

export default function ShowHeroButton({ onShowHero }: ShowHeroButtonProps) {
  const t = useTranslations('HeroSection');
  const [isHeroHidden, setIsHeroHidden] = useState(false);

  useEffect(() => {
    const checkHeroVisibility = () => {
      const isHidden = localStorage.getItem('hero-section-hidden');
      setIsHeroHidden(isHidden === 'true');
    };

    checkHeroVisibility();
    
    // 监听storage变化
    window.addEventListener('storage', checkHeroVisibility);
    
    return () => {
      window.removeEventListener('storage', checkHeroVisibility);
    };
  }, []);

  const handleShowHero = () => {
    localStorage.removeItem('hero-section-hidden');
    setIsHeroHidden(false);
    
    // 触发自定义事件让其他组件知道hero section应该重新显示
    window.dispatchEvent(new CustomEvent('show-hero-section'));
    
    if (onShowHero) {
      onShowHero();
    }
  };

  // 如果hero section没有被隐藏，不显示此按钮
  if (!isHeroHidden) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Button
        onClick={handleShowHero}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <Eye size={16} />
        <span className="text-sm">{t('show_hero_button')}</span>
      </Button>
    </motion.div>
  );
}
