'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  X, 
  Volume2, 
  Eye,
  EyeOff,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type VideoTerm } from '@/hooks/video/use-video-qa';

interface VideoTermsTooltipProps {
  terms: VideoTerm[];
  isVisible: boolean;
  autoShowEnabled: boolean;
  onClose: () => void;
  onToggleAutoShow: () => void;
  onSeekTo?: (time: number) => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export function VideoTermsTooltip({
  terms,
  isVisible,
  autoShowEnabled,
  onClose,
  onToggleAutoShow,
  onSeekTo,
  position = 'top-right'
}: VideoTermsTooltipProps) {
  const t = useTranslations('VideoPlayer');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekToTerm = (time: number) => {
    if (onSeekTo) {
      onSeekTo(time);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isVisible || terms.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`fixed ${getPositionClasses()} w-72 max-h-96 overflow-y-auto bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-blue-500/20 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 z-40`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white/90">
              {t('key_terms')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleAutoShow}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
              title={autoShowEnabled ? t('disable_auto_show') : t('enable_auto_show')}
            >
              {autoShowEnabled ? (
                <Eye className="w-4 h-4 text-emerald-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-white/40" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* Terms List */}
        <div className="p-3 space-y-3">
          {terms.map((term, index) => (
            <motion.div
              key={`${term.term}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-sm p-3 rounded-xl border border-purple-400/30"
            >
              {/* Term Header */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-purple-300 text-sm">
                  {term.term}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(term.timestamp)}</span>
                  </div>
                  <button
                    onClick={() => handleSeekToTerm(term.segment)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title={t('jump_to_term')}
                  >
                    <Volume2 className="w-3 h-3 text-purple-400" />
                  </button>
                </div>
              </div>

              {/* Definition */}
              <p className="text-sm text-white/80 leading-relaxed">
                {term.definition}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Lightbulb className="w-3 h-3" />
            <span>{t('terms_auto_detected')}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// 简化版术语提示组件 - 用于播放器控制栏
export function VideoTermsIndicator({
  termsCount,
  onClick,
  isActive = false
}: {
  termsCount: number;
  onClick: () => void;
  isActive?: boolean;
}) {
  const t = useTranslations('VideoPlayer');

  if (termsCount === 0) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
          : 'bg-white/20 text-purple-300 hover:bg-white/30 hover:text-purple-200 border border-white/20'
      }`}
      title={t('view_key_terms')}
    >
      <GraduationCap className="w-3 h-3" />
      <span>{termsCount}</span>
    </motion.button>
  );
}
