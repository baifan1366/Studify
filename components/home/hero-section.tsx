"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, Zap, ArrowRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HeroSectionProps {
  onStartLearning?: () => void;
  onExploreCourses?: () => void;
}

export default function HeroSection({ onStartLearning, onExploreCourses }: HeroSectionProps) {
  const t = useTranslations('HeroSection');
  const [isVisible, setIsVisible] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 检查本地存储中是否已隐藏hero section
  useEffect(() => {
    const isHidden = localStorage.getItem('hero-section-hidden');
    if (isHidden === 'true') {
      setIsVisible(false);
    }

    // 监听重新显示hero section的事件
    const handleShowHero = () => {
      setIsVisible(true);
    };

    window.addEventListener('show-hero-section', handleShowHero);

    return () => {
      window.removeEventListener('show-hero-section', handleShowHero);
    };
  }, []);

  const handleCloseClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmHide = () => {
    localStorage.setItem('hero-section-hidden', 'true');
    setIsVisible(false);
    setShowConfirmDialog(false);
  };

  const handleCancelHide = () => {
    setShowConfirmDialog(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('close_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('close_dialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelHide}>
              {t('close_dialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmHide}>
              {t('close_dialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <motion.section
      className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-8 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <motion.div
          className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/30 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/30 rounded-full blur-xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleCloseClick}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all duration-200 backdrop-blur-sm"
        title={t('close_button_title') || 'Close hero section'}
        aria-label={t('close_button_aria') || 'Close hero section'}
      >
        <X size={20} />
      </button>

      <div className="relative z-10">
        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Slogan */}
          <motion.h1
            className="text-4xl md:text-6xl font-bold text-white mb-6 dark:text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              {t('main_title_line1')}
            </span>
            <br />
            <span className="text-white/90 dark:text-white/90">
              {t('main_title_line2')}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl text-white/70 mb-8 max-w-2xl mx-auto dark:text-white/70"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {t('subtitle_line1')}
            <br />
            {t('subtitle_line2')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {/* Primary CTA */}
            <motion.button
              onClick={onStartLearning}
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-3">
                <Play size={24} fill="currentColor" />
                {t('primary_cta')}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* Secondary CTA */}
            <motion.button
              onClick={onExploreCourses}
              className="group bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 backdrop-blur-sm transition-all duration-300"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={24} />
                {t('secondary_cta')}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              {t('feature_recommendations')}
            </div>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-blue-400" />
              {t('feature_live_tutoring')}
            </div>
            <div className="flex items-center gap-2">
              <Play size={16} className="text-purple-400" />
              {t('feature_interactive')}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
    </>
  );
}
