"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, Zap, ArrowRight, X, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    const isHidden = localStorage.getItem('hero-section-hidden');
    if (isHidden === 'true') {
      setIsVisible(false);
    }
    const handleShowHero = () => setIsVisible(true);
    window.addEventListener('show-hero-section', handleShowHero);
    return () => window.removeEventListener('show-hero-section', handleShowHero);
  }, []);

  const handleCloseClick = () => setShowConfirmDialog(true);
  const handleConfirmHide = () => {
    localStorage.setItem('hero-section-hidden', 'true');
    setIsVisible(false);
    setShowConfirmDialog(false);
  };
  const handleCancelHide = () => setShowConfirmDialog(false);

  if (!isVisible) return null;

  return (
    <>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('close_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('close_dialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelHide}>{t('close_dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmHide}>{t('close_dialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.section
        className="relative overflow-hidden rounded-2xl border border-orange-500/20 mb-8"
        style={{
          background: 'linear-gradient(135deg, #0D1F1A 0%, #0f2d20 40%, #1a1f0d 70%, #1F1508 100%)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, #FF6B00 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-20 -left-16 w-80 h-80 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-10"
            style={{ background: 'radial-gradient(circle, #FF6B00 0%, #10B981 50%, transparent 70%)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          />
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,107,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleCloseClick}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/80 transition-all duration-200 backdrop-blur-sm border border-white/10"
          title={t('close_button_title')}
          aria-label={t('close_button_aria')}
        >
          <X size={18} />
        </button>

        <div className="relative z-10 px-6 py-12 sm:px-10 sm:py-16">
          {/* Badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-orange-500/30 bg-orange-500/10 text-orange-300">
              <Sparkles size={12} className="text-orange-400" />
              AI-Powered Learning Platform
            </div>
          </motion.div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <span
                className="inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 50%, #FFB366 100%)' }}
              >
                {t('main_title_line1')}
              </span>
              <br />
              <span className="text-white/90">
                {t('main_title_line2')}
              </span>
            </motion.h1>

            <motion.p
              className="text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed"
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
                className="group relative px-8 py-4 rounded-xl font-semibold text-base text-white overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)' }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 rounded-xl" />
                <div className="relative flex items-center gap-3">
                  <Play size={20} fill="currentColor" />
                  {t('primary_cta')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>

              {/* Secondary CTA */}
              <motion.button
                onClick={onExploreCourses}
                className="group px-8 py-4 rounded-xl font-semibold text-base text-white/80 hover:text-white border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={20} />
                  {t('secondary_cta')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
              className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.6 }}
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-orange-400" />
                {t('feature_recommendations')}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-emerald-400" />
                {t('feature_live_tutoring')}
              </div>
              <div className="flex items-center gap-2">
                <Play size={14} className="text-orange-300" />
                {t('feature_interactive')}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </>
  );
}
